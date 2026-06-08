from pathlib import Path

path = Path("frontend/src/pages/admin/AdminPropertyFormPage.tsx")
text = path.read_text()

# Remove duplicate builderFloorListing line
text = text.replace(
'''  const builderFloorListing = isBuilderFloorListing(property.listingType);
  const builderFloorListing = isBuilderFloorListing(property.listingType);
  const validationHint = requiredFieldHint(property.listingType);''',
'''  const builderFloorListing = isBuilderFloorListing(property.listingType);
  const validationHint = requiredFieldHint(property.listingType);'''
)

# Remove duplicate images payload line
text = text.replace(
'''        images: parseArray(property.images),
        images: parseArray(property.images),
        featured: Boolean(property.featured),''',
'''        images: parseArray(property.images),
        featured: Boolean(property.featured),'''
)

# Add live validation helper after validationHint const
marker = '''  const validationHint = requiredFieldHint(property.listingType);'''

addition = '''
  const publishValidationError = useMemo(() => {
    const title = String(property.title || "").trim();
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const price = String(property.price || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const area = String(property.areaSqft || "").trim();

    if (!title) return "Property title is required before publishing.";
    if (!locality) return "Locality is required before publishing.";
    if (!price) return `${labels.price} is required before publishing.`;

    if (rentalListing) {
      if (!society) return "Society is required before publishing a rent listing.";
      if (!deposit) return "Security deposit is required before publishing a rent listing.";
    }

    if (saleListing && !builderFloorListing && !society) {
      return "Society is required before publishing a sale/resale listing.";
    }

    if (builderFloorListing && !area) {
      return "Area is required before publishing a builder floor listing.";
    }

    return "";
  }, [
    property.title,
    property.society,
    property.locality,
    property.price,
    property.securityDeposit,
    property.areaSqft,
    labels.price,
    rentalListing,
    saleListing,
    builderFloorListing,
  ]);
'''

if "const publishValidationError = useMemo" not in text:
    text = text.replace(marker, marker + "\n" + addition)

# Replace handleSave validation so Draft is allowed but Live is blocked
old_validation_start = '''    if (validationError) {
      setError(validationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }'''

new_validation_start = '''    if (status === "Live" && publishValidationError) {
      setError(publishValidationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (status === "Live" && validationError) {
      setError(validationError);
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (status === "Draft" && !title) {
      setError("Property title is required to save a draft.");
      setSuccess("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }'''

text = text.replace(old_validation_start, new_validation_start)

# Add warning UI after success/error blocks
warning_marker = '''        {success ? (
          <div className="mb-5 rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}'''

warning_block = '''        {success ? (
          <div className="mb-5 rounded-2xl bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        {publishValidationError ? (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700">
            Publish blocked: {publishValidationError}
          </div>
        ) : null}'''

if "Publish blocked:" not in text:
    text = text.replace(warning_marker, warning_block)

# Disable desktop Publish button when validation error exists
text = text.replace(
'''              disabled={saving}
              className="rounded-full bg-blue-600 px-5 hover:bg-blue-700"''',
'''              disabled={saving || Boolean(publishValidationError)}
              className="rounded-full bg-blue-600 px-5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"''',
1
)

# Disable mobile Publish button when validation error exists
text = text.replace(
'''              disabled={saving}
              className="h-11 rounded-full bg-blue-600 hover:bg-blue-700"''',
'''              disabled={saving || Boolean(publishValidationError)}
              className="h-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"''',
1
)

path.write_text(text)
print("C6C-5 publish lock applied.")
