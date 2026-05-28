import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://final-now.onrender.com/api";

export default function AdminPropertyCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    society: "",
    listing_type: "Rent",
    price: "",
    bedrooms: "",
    bathrooms: "",
    area_sqft: "",
    furnished_status: "",
    locality: "",
    description: "",
    image: "",
    amenities: "",
  });

  const [loading, setLoading] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        ...form,
        images: form.image ? [form.image] : [],
        amenities: form.amenities
          ? form.amenities.split(",").map((a) => a.trim())
          : [],
        verified: true,
        featured: true,
      };

      const res = await fetch(`${API_BASE}/admin/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data?.data?.slug) {
        alert("Property created successfully");
        navigate(`/property/${data.data.slug}`);
      } else {
        alert("Failed to create property");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-10">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-4xl font-bold mb-8">
          Create Property
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Title"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
          />

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Society"
            value={form.society}
            onChange={(e) => updateField("society", e.target.value)}
          />

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Locality"
            value={form.locality}
            onChange={(e) => updateField("locality", e.target.value)}
          />

          <select
            className="w-full border rounded-2xl p-4"
            value={form.listing_type}
            onChange={(e) =>
              updateField("listing_type", e.target.value)
            }
          >
            <option>Rent</option>
            <option>Sale</option>
          </select>

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Price"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
          />

          <div className="grid grid-cols-3 gap-4">
            <input
              className="border rounded-2xl p-4"
              placeholder="Bedrooms"
              value={form.bedrooms}
              onChange={(e) =>
                updateField("bedrooms", e.target.value)
              }
            />

            <input
              className="border rounded-2xl p-4"
              placeholder="Bathrooms"
              value={form.bathrooms}
              onChange={(e) =>
                updateField("bathrooms", e.target.value)
              }
            />

            <input
              className="border rounded-2xl p-4"
              placeholder="Area sqft"
              value={form.area_sqft}
              onChange={(e) =>
                updateField("area_sqft", e.target.value)
              }
            />
          </div>

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Furnished Status"
            value={form.furnished_status}
            onChange={(e) =>
              updateField("furnished_status", e.target.value)
            }
          />

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Image URL"
            value={form.image}
            onChange={(e) => updateField("image", e.target.value)}
          />

          <input
            className="w-full border rounded-2xl p-4"
            placeholder="Amenities comma separated"
            value={form.amenities}
            onChange={(e) =>
              updateField("amenities", e.target.value)
            }
          />

          <textarea
            className="w-full border rounded-2xl p-4 min-h-[140px]"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              updateField("description", e.target.value)
            }
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 font-semibold"
          >
            {loading ? "Creating..." : "Create Property"}
          </button>
        </form>
      </div>
    </div>
  );
}
