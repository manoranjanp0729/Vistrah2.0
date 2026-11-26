"use client"

import { FormEvent, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getMarketingService } from "../../../../data/marketing"

export default function MarketingServicePage() {
  const params = useParams()
  const router = useRouter()

  const subslug = String(params.subslug || "")
  const serviceSlug = String(params.service || "")
  const service = getMarketingService(subslug, serviceSlug)

  const [form, setForm] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  if (!service) {
    return (
      <main style={{ padding: 40, fontFamily: "Arial" }}>

        <h1>Service not found</h1>
        <button onClick={() => router.push("/service/marketing")}>Back to Marketing</button>
      </main>
    )
  }

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="successPage">
        <div className="successCard">
          <div className="successIcon">✓</div>
          <p className="eyebrow">REQUEST RECEIVED</p>
          <h1>We have your requirements.</h1>
          <p>
            Your request for <strong>{service.name}</strong> has been captured.
            VISTRAH will review the information and contact you with the next step.
          </p>
          <button onClick={() => router.push("/service/marketing")}>
            Back to Marketing
          </button>
        </div>

        <style jsx>{`
          .successPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 30px;
            background: #f7faf8;
            font-family: Arial, sans-serif;
            color: #17352a;
          }

          .successCard {
            width: min(620px, 100%);
            padding: 50px;
            border-radius: 22px;
            background: #fff;
            text-align: center;
            box-shadow: 0 20px 60px rgba(25,65,45,.1);
          }

          .successIcon {
            width: 64px;
            height: 64px;
            display: grid;
            place-items: center;
            margin: 0 auto 22px;
            border-radius: 50%;
            background: #e4f3e9;
            color: #17613f;
            font-size: 30px;
            font-weight: 900;
          }

          .eyebrow {
            margin: 0 0 10px;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .15em;
            color: #688274;
          }

          h1 {
            margin: 0 0 16px;
            font-size: 38px;
            letter-spacing: -.04em;
          }

          p {
            color: #65746c;
            line-height: 1.65;
          }

          button {
            margin-top: 20px;
            border: 0;
            border-radius: 10px;
            padding: 14px 22px;
            background: #073b27;
            color: #fff;
            font-weight: 800;
            cursor: pointer;
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="servicePage">
      <header className="serviceHeader">
        <button
          className="backButton"
          onClick={() => router.push(`/service/marketing/${subslug}`)}
        >
          ← Back
        </button>
        <div className="brand">VISTRAH</div>
      </header>

      <div className="pageContainer">
        <section className="serviceIntro">
          <p className="eyebrow">MARKETING SERVICE</p>
          <h1>{service.name}</h1>
          <p>{service.description}</p>
        </section>

        <section className="formCard">
          <div className="formHeading">
            <div>
              <p className="eyebrow">YOUR REQUIREMENTS</p>
              <h2>Tell us what you need</h2>
            </div>
            <span>Step 1 of 1</span>
          </div>

          <form onSubmit={submitForm}>
            <div className="fields">
              {service.fields.map((field) => (
                <div
                  key={field.name}
                  className={field.type === "textarea" ? "field full" : "field"}
                >
                  <label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span> *</span>}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      id={field.name}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={form[field.name] || ""}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      rows={5}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      required={field.required}
                      value={form[field.name] || ""}
                      onChange={(e) => updateField(field.name, e.target.value)}
                    >
                      <option value="">Select</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "file" ? (
                    <input
                      id={field.name}
                      type="file"
                      required={field.required}
                      onChange={(e) =>
                        updateField(field.name, e.target.files?.[0]?.name || "")
                      }
                    />
                  ) : (
                    <input
                      id={field.name}
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={form[field.name] || ""}
                      onChange={(e) => updateField(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="formFooter">
              <p>
                You can review everything before payment. VISTRAH will process
                your request after submission.
              </p>
              <button type="submit">Submit Requirements →</button>
            </div>
          </form>
        </section>
      </div>

      <style jsx>{`
        .servicePage {
          min-height: 100vh;
          background: #f8faf9;
          color: #17352a;
          font-family: Arial, sans-serif;
        }

        .serviceHeader {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          background: rgba(255,255,255,.96);
          border-bottom: 1px solid #e5eae7;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .brand {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: .14em;
          color: #073b27;
        }

        .backButton {
          border: 0;
          background: transparent;
          color: #164d37;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .pageContainer {
          max-width: 1050px;
          margin: 0 auto;
          padding: 55px 24px 80px;
        }

        .serviceIntro {
          margin-bottom: 28px;
        }

        .eyebrow {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .16em;
          color: #688274;
        }

        .serviceIntro h1 {
          margin: 0 0 14px;
          font-size: clamp(40px, 5vw, 62px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .serviceIntro > p:last-child {
          max-width: 700px;
          margin: 0;
          font-size: 18px;
          line-height: 1.6;
          color: #66766d;
        }

        .formCard {
          background: #fff;
          border: 1px solid #e2e8e4;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 15px 45px rgba(25,65,45,.06);
        }

        .formHeading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          padding-bottom: 25px;
          border-bottom: 1px solid #e8ecea;
          margin-bottom: 28px;
        }

        .formHeading h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -.03em;
        }

        .formHeading > span {
          color: #78867f;
          font-size: 13px;
        }

        .fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        label {
          font-size: 14px;
          font-weight: 800;
          color: #29483a;
        }

        label span {
          color: #c54b35;
        }

        input,
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce4df;
          border-radius: 10px;
          padding: 13px 14px;
          font: inherit;
          color: #19372b;
          background: #fff;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #6e9b82;
          box-shadow: 0 0 0 3px rgba(65,125,88,.09);
        }

        textarea {
          resize: vertical;
        }

        .formFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          margin-top: 30px;
          padding-top: 25px;
          border-top: 1px solid #e8ecea;
        }

        .formFooter p {
          margin: 0;
          max-width: 550px;
          font-size: 13px;
          line-height: 1.5;
          color: #718078;
        }

        .formFooter button {
          flex-shrink: 0;
          border: 0;
          border-radius: 10px;
          padding: 15px 22px;
          background: #073b27;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .serviceHeader {
            padding: 0 18px;
          }

          .pageContainer {
            padding: 35px 18px 60px;
          }

          .formCard {
            padding: 22px;
          }

          .fields {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .formHeading,
          .formFooter {
            align-items: flex-start;
            flex-direction: column;
          }

          .formFooter button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}


