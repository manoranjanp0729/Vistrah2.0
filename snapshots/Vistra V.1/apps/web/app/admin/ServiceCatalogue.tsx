"use client";

import { useCallback, useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function token() {
  if (typeof window === "undefined") return "";

  const keys = [
    "access_token",
    "token",
    "vistrah_access_token",
    "auth_token",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value && value.split(".").length === 3) return value;
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key);
    if (value && value.split(".").length === 3) return value;
  }

  return "";
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json();
}

export default function ServiceCatalogue() {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    description: "",
    pricing_type: "ON_REQUEST",
  });

  const loadCategories = useCallback(async () => {
    const result = await request("/admin/service-categories");
    setCategories(result);
  }, []);

  async function loadSubcategories(categoryId: string) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    const result = await request(
      `/admin/service-subcategories?category_id=${encodeURIComponent(categoryId)}`
    );

    setSubcategories(result);
  }

  async function loadServices(subcategoryId: string) {
    if (!subcategoryId) {
      setServices([]);
      return;
    }

    const result = await request(
      `/admin/master-services?subcategory_id=${encodeURIComponent(subcategoryId)}`
    );

    setServices(result);
  }

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      await loadCategories();
    } catch (err: any) {
      setError(err?.message || "Unable to load service catalogue");
    } finally {
      setLoading(false);
    }
  }, [loadCategories]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function chooseCategory(id: string) {
    setSelectedCategory(id);
    setSelectedSubcategory("");
    setServices([]);

    try {
      await loadSubcategories(id);
    } catch (err: any) {
      setError(err?.message || "Unable to load subcategories");
    }
  }

  async function chooseSubcategory(id: string) {
    setSelectedSubcategory(id);

    try {
      await loadServices(id);
    } catch (err: any) {
      setError(err?.message || "Unable to load services");
    }
  }

  async function createCategory() {
    if (!categoryForm.name.trim()) {
      setError("Category name is required");
      return;
    }

    try {
      setError("");

      await request("/admin/service-categories", {
        method: "POST",
        body: JSON.stringify({
          ...categoryForm,
          slug:
            categoryForm.slug ||
            categoryForm.name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
        }),
      });

      setCategoryForm({
        name: "",
        slug: "",
        description: "",
        icon: "",
      });

      setShowCategoryForm(false);
      await loadCategories();
    } catch (err: any) {
      setError(err?.message || "Unable to create category");
    }
  }

  async function createSubcategory() {
    if (!selectedCategory) {
      setError("Select a category first");
      return;
    }

    if (!subcategoryForm.name.trim()) {
      setError("Subcategory name is required");
      return;
    }

    try {
      setError("");

      await request("/admin/service-subcategories", {
        method: "POST",
        body: JSON.stringify({
          category_id: selectedCategory,
          ...subcategoryForm,
          slug:
            subcategoryForm.slug ||
            subcategoryForm.name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
        }),
      });

      setSubcategoryForm({
        name: "",
        slug: "",
        description: "",
      });

      setShowSubcategoryForm(false);
      await loadSubcategories(selectedCategory);
    } catch (err: any) {
      setError(err?.message || "Unable to create subcategory");
    }
  }

  async function createService() {
    if (!selectedSubcategory) {
      setError("Select a subcategory first");
      return;
    }

    if (!serviceForm.name.trim()) {
      setError("Service name is required");
      return;
    }

    try {
      setError("");

      await request("/admin/master-services", {
        method: "POST",
        body: JSON.stringify({
          subcategory_id: selectedSubcategory,
          ...serviceForm,
          slug:
            serviceForm.slug ||
            serviceForm.name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
        }),
      });

      setServiceForm({
        name: "",
        slug: "",
        description: "",
        pricing_type: "ON_REQUEST",
      });

      setShowServiceForm(false);
      await loadServices(selectedSubcategory);
    } catch (err: any) {
      setError(err?.message || "Unable to create service");
    }
  }

  if (loading) {
    return <div className="empty">Loading service catalogue...</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Service Catalogue</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.65 }}>
            Manage VISTRAH categories, subcategories and master services.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowCategoryForm(true)}
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 18,
            borderRadius: 8,
            background: "#fff3f3",
            color: "#a22",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.4fr",
          gap: 16,
        }}
      >
        <section className="table-wrap">
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Categories</strong>
            <span>{categories.length}</span>
          </div>

          {categories.length === 0 ? (
            <Empty />
          ) : (
            categories.map((category) => (
              <button
                key={category.id}
                onClick={() => chooseCategory(category.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  border: 0,
                  borderBottom: "1px solid #eee",
                  background:
                    selectedCategory === category.id ? "#f5f1e8" : "white",
                  cursor: "pointer",
                }}
              >
                <strong>{category.name}</strong>
                <div style={{ fontSize: 12, opacity: 0.55 }}>
                  {category.slug}
                </div>
              </button>
            ))
          )}
        </section>

        <section className="table-wrap">
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Subcategories</strong>

            <button
              className="secondary-button"
              disabled={!selectedCategory}
              onClick={() => setShowSubcategoryForm(true)}
            >
              + Add
            </button>
          </div>

          {!selectedCategory ? (
            <Empty text="Select a category" />
          ) : subcategories.length === 0 ? (
            <Empty text="No subcategories" />
          ) : (
            subcategories.map((subcategory) => (
              <button
                key={subcategory.id}
                onClick={() => chooseSubcategory(subcategory.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  border: 0,
                  borderBottom: "1px solid #eee",
                  background:
                    selectedSubcategory === subcategory.id
                      ? "#f5f1e8"
                      : "white",
                  cursor: "pointer",
                }}
              >
                <strong>{subcategory.name}</strong>
                <div style={{ fontSize: 12, opacity: 0.55 }}>
                  {subcategory.slug}
                </div>
              </button>
            ))
          )}
        </section>

        <section className="table-wrap">
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Master Services</strong>

            <button
              className="secondary-button"
              disabled={!selectedSubcategory}
              onClick={() => setShowServiceForm(true)}
            >
              + Add
            </button>
          </div>

          {!selectedSubcategory ? (
            <Empty text="Select a subcategory" />
          ) : services.length === 0 ? (
            <Empty text="No master services" />
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{service.name}</strong>

                <div style={{ fontSize: 12, opacity: 0.55 }}>
                  {service.slug}
                </div>

                <div style={{ fontSize: 12, marginTop: 5 }}>
                  {service.pricing_type || "ON_REQUEST"}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {showCategoryForm && (
        <Modal title="Add Category" onClose={() => setShowCategoryForm(false)}>
          <Input
            label="Category name"
            value={categoryForm.name}
            onChange={(v) =>
              setCategoryForm({ ...categoryForm, name: v })
            }
          />
          <Input
            label="Slug"
            value={categoryForm.slug}
            onChange={(v) =>
              setCategoryForm({ ...categoryForm, slug: v })
            }
          />
          <Input
            label="Description"
            value={categoryForm.description}
            onChange={(v) =>
              setCategoryForm({ ...categoryForm, description: v })
            }
          />
          <Actions
            onCancel={() => setShowCategoryForm(false)}
            onSave={createCategory}
          />
        </Modal>
      )}

      {showSubcategoryForm && (
        <Modal
          title="Add Subcategory"
          onClose={() => setShowSubcategoryForm(false)}
        >
          <Input
            label="Subcategory name"
            value={subcategoryForm.name}
            onChange={(v) =>
              setSubcategoryForm({ ...subcategoryForm, name: v })
            }
          />
          <Input
            label="Slug"
            value={subcategoryForm.slug}
            onChange={(v) =>
              setSubcategoryForm({ ...subcategoryForm, slug: v })
            }
          />
          <Input
            label="Description"
            value={subcategoryForm.description}
            onChange={(v) =>
              setSubcategoryForm({ ...subcategoryForm, description: v })
            }
          />
          <Actions
            onCancel={() => setShowSubcategoryForm(false)}
            onSave={createSubcategory}
          />
        </Modal>
      )}

      {showServiceForm && (
        <Modal
          title="Add Master Service"
          onClose={() => setShowServiceForm(false)}
        >
          <Input
            label="Service name"
            value={serviceForm.name}
            onChange={(v) =>
              setServiceForm({ ...serviceForm, name: v })
            }
          />
          <Input
            label="Slug"
            value={serviceForm.slug}
            onChange={(v) =>
              setServiceForm({ ...serviceForm, slug: v })
            }
          />
          <Input
            label="Description"
            value={serviceForm.description}
            onChange={(v) =>
              setServiceForm({ ...serviceForm, description: v })
            }
          />

          <label style={{ display: "block", marginTop: 14 }}>
            <span style={{ display: "block", marginBottom: 6 }}>
              Pricing type
            </span>
            <select
              value={serviceForm.pricing_type}
              onChange={(e) =>
                setServiceForm({
                  ...serviceForm,
                  pricing_type: e.target.value,
                })
              }
              style={{ width: "100%", padding: 10 }}
            >
              <option value="ON_REQUEST">On Request</option>
              <option value="FIXED">Fixed</option>
              <option value="STARTING_FROM">Starting From</option>
              <option value="QUOTE">Quote</option>
            </select>
          </label>

          <Actions
            onCancel={() => setShowServiceForm(false)}
            onSave={createService}
          />
        </Modal>
      )}
    </div>
  );
}

function Empty({ text = "No records available" }) {
  return (
    <div style={{ padding: 28, textAlign: "center", opacity: 0.55 }}>
      {text}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", marginBottom: 6 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 6,
        }}
      />
    </label>
  );
}

function Actions({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 20,
      }}
    >
      <button className="secondary-button" onClick={onCancel}>
        Cancel
      </button>
      <button className="primary-button" onClick={onSave}>
        Save
      </button>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>

          <button
            onClick={onClose}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
