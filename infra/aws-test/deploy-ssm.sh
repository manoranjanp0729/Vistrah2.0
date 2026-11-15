#!/usr/bin/env bash
# Zero-SSH deployment helper for VISTRAH 2.0 via AWS Systems Manager (aws ssm send-command).
# Targets EC2 i-08287d636ff13ddf0 (ap-south-1) over IAM-authenticated SSM without opening TCP port 22.
set -euo pipefail

INSTANCE_ID="${INSTANCE_ID:-i-08287d636ff13ddf0}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_PROFILE_ARGS=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
    AWS_PROFILE_ARGS=(--profile "$AWS_PROFILE")
fi
ECR_REGISTRY="${ECR_REGISTRY:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DRY_RUN="${DRY_RUN:-0}"
SERVICES=("${@:-api web phone-web}")
if [[ $# -eq 0 ]]; then
    SERVICES=(api web phone-web)
fi

for svc in "${SERVICES[@]}"; do
    case "$svc" in
        api|web|phone-web|admin) ;;
        *) echo "Unsupported service '$svc' (allowed: api, web, phone-web, admin)" >&2; exit 1 ;;
    esac
done

if [[ -n "$ECR_REGISTRY" && ! "$ECR_REGISTRY" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com$ ]]; then
    echo "Invalid ECR_REGISTRY '$ECR_REGISTRY'" >&2
    exit 1
fi

if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "Invalid IMAGE_TAG '$IMAGE_TAG'" >&2
    exit 1
fi

SERVICE_LIST="${SERVICES[*]}"
ECR_BLOCK=""
if [[ -n "$ECR_REGISTRY" ]]; then
    ECR_REGION="$(cut -d. -f4 <<<"$ECR_REGISTRY")"
    ECR_BLOCK="aws ecr get-login-password --region ${ECR_REGION} | sudo docker login --username AWS --password-stdin ${ECR_REGISTRY}
for svc in ${SERVICE_LIST}; do
  remote_ref=\"${ECR_REGISTRY}/vistrah20-\${svc}:${IMAGE_TAG}\"
  sudo docker pull \"\$remote_ref\"
  sudo docker image tag \"\$remote_ref\" \"vistrah20-\${svc}:latest\"
done"
fi

REMOTE_SCRIPT=$(cat <<EOF
set -euo pipefail
cd /home/ec2-user/vistrah
[[ -f compose.cloud.yaml && -f .env ]] || { echo "Missing compose.cloud.yaml or .env" >&2; exit 1; }
grep -Eq "command:.*uvicorn" compose.cloud.yaml || { echo "Refusing rollout: api command does not run direct uvicorn" >&2; exit 1; }
stamp=\$(date -u +%Y%m%d-%H%M%S)
declare -A rollback_tags=()
for svc in ${SERVICE_LIST}; do
  cname="vistrah-cloud-\${svc}-1"
  if sudo docker inspect "\$cname" >/dev/null 2>&1; then
    current_img=\$(sudo docker inspect "\$cname" --format '{{.Image}}')
    rtag="vistrah20-\${svc}:rollback-\${stamp}"
    sudo docker image tag "\$current_img" "\$rtag"
    rollback_tags[\$svc]="\$rtag"
  fi
done
${ECR_BLOCK}
rollback_services() {
  echo "Rollout failed; restoring previous container image tags..." >&2
  for svc in ${SERVICE_LIST}; do
    if [[ -n "\${rollback_tags[\$svc]:-}" ]]; then
      sudo docker image tag "\${rollback_tags[\$svc]}" "vistrah20-\${svc}:latest"
    fi
  done
  sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait --wait-timeout 90 ${SERVICE_LIST} || true
}
if ! sudo docker compose --ansi never -f compose.cloud.yaml up -d --no-deps --wait --wait-timeout 120 ${SERVICE_LIST}; then
  rollback_services
  exit 1
fi
sudo docker image prune -f >/dev/null
sudo docker compose --ansi never -f compose.cloud.yaml ps
curl --fail --silent --show-error --max-time 15 https://vistrah.in/api/health
echo ""
df -h /
EOF
)

if [[ "$DRY_RUN" == "1" ]]; then
    printf '[DRY_RUN] Instance=%s Region=%s Services=%s\n%s\n' "$INSTANCE_ID" "$AWS_REGION" "$SERVICE_LIST" "$REMOTE_SCRIPT"
    exit 0
fi

ping_status=$(aws ssm describe-instance-information "${AWS_PROFILE_ARGS[@]}" \
    --region "$AWS_REGION" \
    --filters "Key=InstanceIds,Values=${INSTANCE_ID}" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text)

if [[ "$ping_status" != "Online" ]]; then
    echo "Instance ${INSTANCE_ID} is not Online in SSM (status: ${ping_status}). Attach IAM instance profile first." >&2
    exit 1
fi

param_json=$(python3 -c 'import json, sys; print(json.dumps({"commands": [sys.stdin.read()]}))' <<<"$REMOTE_SCRIPT")
cmd_id=$(aws ssm send-command "${AWS_PROFILE_ARGS[@]}" \
    --region "$AWS_REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --comment "VISTRAH Zero-SSH rollout (${SERVICE_LIST})" \
    --timeout-seconds 300 \
    --parameters "$param_json" \
    --query 'Command.CommandId' \
    --output text)

echo "Dispatched SSM CommandId ${cmd_id}; waiting for execution..."
aws ssm wait command-executed "${AWS_PROFILE_ARGS[@]}" \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" || true

status=$(aws ssm get-command-invocation "${AWS_PROFILE_ARGS[@]}" \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" \
    --query 'Status' \
    --output text)

aws ssm get-command-invocation "${AWS_PROFILE_ARGS[@]}" \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" \
    --query 'StandardOutputContent' \
    --output text

if [[ "$status" != "Success" ]]; then
    aws ssm get-command-invocation "${AWS_PROFILE_ARGS[@]}" \
        --region "$AWS_REGION" \
        --command-id "$cmd_id" \
        --instance-id "$INSTANCE_ID" \
        --query 'StandardErrorContent' \
        --output text >&2
    echo "SSM command ${cmd_id} failed with status ${status}" >&2
    exit 1
fi

curl --fail --silent --show-error --max-time 20 https://vistrah.in/api/health
echo ""
