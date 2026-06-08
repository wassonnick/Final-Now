from pathlib import Path
import re

path = Path("frontend/src/pages/admin/AdminPropertyFormPage.tsx")
text = path.read_text()

start = text.find("  const handleSave = async (status: string) => {")
end = text.find("  const generateDescription", start)

if start == -1 or end == -1:
    raise SystemExit("Could not find handleSave block. Stop and upload AdminPropertyFormPage.tsx.")

new_handle_save = r'''  const handleSave = async (status: string) => {
    const title = String(property.title || "").trim();
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const price = String(property.price || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const area = String(property.areaSqft || "").trim();

    const listingTypeValue = String(property.listingType || "").toLowerCase();
    const isRent = listingTypeValue.includes("rent");
    const isBuilderFloor = listingTypeValue.includes("builder");
    const isSaleLike =
      listingTypeValue.includes("sale") ||
      listingTypeValue.includes("buy") ||
      listingTypeValue.includes("sell") ||
      listingTypeValue.includes("resale");

    const priceLabel = isRent
      ? "Monthly rent"
      : isBuilderFloor
        ? "Asking price"
        : "Sale price";

    let validationError = "";

    if (!title) {
      validationError = "Property title is required.";
    } else if (!locality) {
      validationError = "Locality is required.";
    } else if (!price) {
      validationError = `${priceLabel} is required.`;
    } else if (isRent && !society) {
      validationError = "Society is required for rent listings.";
    } else if (isRent && !deposit) {
      validationError = "Security deposit is required for rent listings.";
    } else if (isSaleLike && !isBuilderFloor && !society) {
      validationError = "Society is required for sale/resale listings.";
    } else if (isBuilderFloor && !area) {
      validationError = "Area is required for builder floor listings.";
    }

    if (validationError) {
      setError(validationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSaving(true);
      setSaveMode(status as "Draft" | "Live");
      setError("");

      const payload = {
        title,
        slug: makeSlug(title),
        listing_type: property.listingType,
        status,
        society: property.society,
        locality: property.locality,
        price: property.price || "On Request",
        security_deposit: property.securityDeposit,
        maintenance: property.maintenance,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area_sqft: property.areaSqft,
        floor: property.floor,
        facing: property.facing,
        furnished_status: property.furnishedStatus,
        description: property.description,
        amenities: parseArray(property.amenities),
        images: parseArray(property.images),
        featured: Boolean(property.featured),
        verified: Boolean(property.verified),
      };

      const response = await adminFetch(isEdit ? `/admin/properties/${id}` : "/admin/properties", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...adminHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(json);
        throw new Error(json?.message || "Save failed");
      }

      setSuccess(status === "Draft" ? "Property draft saved." : "Property listing saved and published.");
      navigate("/admin/properties");
    } catch (err) {
      console.error(err);
      setError("Could not save the property. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
      setSaveMode(null);
    }
  };

'''

text = text[:start] + new_handle_save + text[end:]

# Make sure there is no older validate() blocking confusion; leave it if present, but handleSave now does hard validation.
path.write_text(text)

print("C6C-4 hard validation applied inside handleSave().")
