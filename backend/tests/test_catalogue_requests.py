from app.models import Category, Service, ServiceInformation
from app.provider_models import ProviderCatalogueRequest
from sqlalchemy import select

def request(client,headers,kind,title,category_id=None,subcategory_id=None):
    return client.post('/seller/catalogue-requests',headers=headers,json={
        'kind':kind,'title':title,'description':'Synthetic proposal for isolated review.',
        **({'category_id':category_id} if category_id is not None else {}),
        **({'subcategory_id':subcategory_id} if subcategory_id is not None else {}),
    })

def test_catalogue_additions_require_review_and_remain_inactive(client,seeded,customer,admin,db):
    catalogue=client.get('/catalogue').json()
    category=next(item for item in catalogue if item['subcategories'])
    subcategory=category['subcategories'][0]
    other_category=next(item for item in catalogue if item['id']!=category['id'])
    category_request=request(client,customer,'CATEGORY','Synthetic new marketplace category')
    subcategory_request=request(client,customer,'SUBCATEGORY','Synthetic new marketplace subcategory',category['id'])
    service_request=request(client,customer,'SERVICE','Synthetic new marketplace service',category['id'],subcategory['id'])
    assert all(response.status_code==201 for response in (category_request,subcategory_request,service_request))
    rows=client.get('/seller/catalogue-requests',headers=customer).json()
    assert len(rows)==3 and all(row['status']=='PENDING' for row in rows)
    assert client.get('/admin/catalogue-requests',headers=customer).status_code==403
    assert len(client.get('/admin/catalogue-requests',headers=admin).json())==3

    wrong_parent=request(client,customer,'SERVICE','Synthetic mismatched parent',other_category['id'],subcategory['id'])
    assert wrong_parent.status_code==422
    invalid=client.post('/seller/catalogue-requests',headers=customer,json={
        'kind':'CATEGORY','category_id':category['id'],'title':'Invalid category','description':'Invalid parent shape.',
    })
    assert invalid.status_code==422

    category_id=category_request.json()['id']
    approved=client.post(f'/admin/catalogue-requests/{category_id}/review',headers=admin,json={
        'status':'APPROVED','reason':'Proposal accepted; hidden until launch review.',
    })
    assert approved.status_code==200,approved.text
    created_category=db.get(Category,approved.json()['catalogue_id'])
    assert created_category and not created_category.active
    assert created_category.id not in [row['id'] for row in client.get('/catalogue').json()]
    seller_rows=client.get('/seller/catalogue-requests',headers=customer).json()
    assert next(row for row in seller_rows if row['id']==category_id)['review_note']=='Proposal accepted; hidden until launch review.'

    service_id=service_request.json()['id']
    approved_service=client.post(f'/admin/catalogue-requests/{service_id}/review',headers=admin,json={
        'status':'APPROVED','reason':'Add after requirements are prepared and checked.',
    })
    assert approved_service.status_code==200,approved_service.text
    service=db.get(Service,approved_service.json()['catalogue_id'])
    assert service and not service.active and service.category_id==category['id']
    assert db.get(ServiceInformation,service.id) is not None
    assert client.get('/provider-requirements/'+str(service.id),headers=customer).status_code==404

    rejected_id=subcategory_request.json()['id']
    rejected=client.post(f'/admin/catalogue-requests/{rejected_id}/review',headers=admin,json={
        'status':'REJECTED','reason':'Overlaps existing categories in this section.',
    })
    assert rejected.status_code==200 and rejected.json()['status']=='REJECTED'
    seller_rows=client.get('/seller/catalogue-requests',headers=customer).json()
    assert next(row for row in seller_rows if row['id']==rejected_id)['review_note']=='Overlaps existing categories in this section.'
    assert db.scalar(select(ProviderCatalogueRequest).where(ProviderCatalogueRequest.id==rejected_id)).reviewer_id
    assert client.post(f'/admin/catalogue-requests/{rejected_id}/review',headers=admin,json={
        'status':'REJECTED','reason':'Repeated decision must fail.',
    }).status_code==409
