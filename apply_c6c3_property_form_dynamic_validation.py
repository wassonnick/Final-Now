from pathlib import Path

path = Path("frontend/src/pages/admin/AdminPropertyFormPage.tsx")
text = path.read_text()

# Add helper after pricingLabels if not already present.
marker = '''function pricingLabels(listingType: string) {
  if (isRentalListing(listingType)) {
    return {
      price: "Monthly Rent",
      pricePlaceholder: "₹85,000/mo",
      deposit: "Security Deposit",
      depositPlaceholder: "₹1,70,000",
      maintenance: "Maintenance",
      maintenancePlaceholder: "Included / ₹12,000",
    };
  }

  if (String(listingType || "").toLowerCase().includes("builder")) {
    return {
      price: "Asking Price",
      pricePlaceholder: "₹4.2 Cr",
      deposit: "Booking Amount",
      depositPlaceholder: "₹5,00,000",
      maintenance: "Maintenance",
      maintenancePlaceholder: "₹12,000 / Included",
    };
  }

  return {
    price: "Sale Price",
    pricePlaceholder: "₹4.2 Cr",
    deposit: "Token / Booking Amount",
    depositPlaceholder: "₹5,00,000",
    maintenance: "Maintenance",
    maintenancePlaceholder: "₹12,000 / Included",
  };
}
'''

addition = '''
function isBuilderFloorListing(listingType: string) {
  return String(listingType || "").toLowerCase().includes("builder");
}

function requiredFieldHint(listingType: string) {
  if (isRentalListing(listingType)) {
    return "For rent listings, title, society, locality, monthly rent and security deposit are required.";
  }

  if (isBuilderFloorListing(listingType)) {
    return "For builder floors, title, locality, asking price and area are required. Booking amount is optional.";
  }

  return "For sale/resale listings, title, society, locality and sale price are required. Token amount is optional.";
}
'''

if marker in text and "function requiredFieldHint" not in text:
    text = text.replace(marker, marker + addition)

# Add computed builder flag and validation hint after existing labels const.
old = '''  const labels = pricingLabels(property.listingType);
  const rentalListing = isRentalListing(property.listingType);
  const saleListing = isSaleListing(property.listingType);
'''

new = '''  const labels = pricingLabels(property.listingType);
  const rentalListing = isRentalListing(property.listingType);
  const saleListing = isSaleListing(property.listingType);
  const builderFloorListing = isBuilderFloorListing(property.listingType);
  const validationHint = requiredFieldHint(property.listingType);
'''

if old in text and "const validationHint = requiredFieldHint" not in text:
    text = text.replace(old, new)

# Replace validate function.
start = text.find("  const validate = () => {")
end = text.find("  const handleSave = async", start)
if start != -1 and end != -1:
    validate_block = '''  const validate = () => {
    const title = String(property.title || "").trim();
    const price = String(property.price || "").trim();
    const deposit = String(property.securityDeposit || "").trim();
    const society = String(property.society || "").trim();
    const locality = String(property.locality || "").trim();
    const area = String(property.areaSqft || "").trim();

    if (!title) return "Property title is required.";
    if (!locality) return "Please select a locality.";
    if (!price) return `${labels.price} is required.`;

    if (rentalListing) {
      if (!society) return "Please select a society for the rental listing.";
      if (!deposit) return "Security deposit is required for rent listings.";
    }

    if (saleListing && !builderFloorListing) {
      if (!society) return "Please select a society for the sale/resale listing.";
    }

    if (builderFloorListing && !area) {
      return "Area is required for builder floor listings.";
    }

    return "";
  };

'''
    text = text[:start] + validate_block + text[end:]

# Add validation hint under Pricing & Configuration paragraph if not present.
old = '''              <p className="mt-1 text-sm text-slate-500">
                {rentalListing
                  ? "Add rent, deposit and configuration details for rental inventory."
                  : "Add asking price, booking/token amount and configuration details for sale inventory."}
              </p>'''

new = '''              <p className="mt-1 text-sm text-slate-500">
                {rentalListing
                  ? "Add rent, deposit and configuration details for rental inventory."
                  : "Add asking price, booking/token amount and configuration details for sale inventory."}
              </p>
              <p className="mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                {validationHint}
              </p>'''

if old in text and "{validationHint}" not in text:
    text = text.replace(old, new)

# Add small required markers in labels via replacements
text = text.replace(
'''                  {labels.price}
                  <Input''',
'''                  {labels.price} <span className="text-rose-500">*</span>
                  <Input'''
)

text = text.replace(
'''                  {labels.deposit}
                  <Input''',
'''                  {labels.deposit} {rentalListing ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-400">(optional)</span>}
                  <Input'''
)

text = text.replace(
'''                  Area (sq ft)
                  <Input''',
'''                  Area (sq ft) {builderFloorListing ? <span className="text-rose-500">*</span> : null}
                  <Input'''
)

text = text.replace(
'''                  Society
                  <select''',
'''                  Society {!builderFloorListing ? <span className="text-rose-500">*</span> : <span className="text-xs font-normal text-slate-400">(optional for builder floor)</span>}
                  <select'''
)

text = text.replace(
'''                  Locality
                  <select''',
'''                  Locality <span className="text-rose-500">*</span>
                  <select'''
)

text = text.replace(
'''                  Property Title
                  <Input''',
'''                  Property Title <span className="text-rose-500">*</span>
                  <Input'''
)

# Update checklist to show validation hint.
old_checklist = '''              <h2 className="font-bold text-slate-950">Listing checklist</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">'''

new_checklist = '''              <h2 className="font-bold text-slate-950">Listing checklist</h2>
              <p className="mt-2 text-sm text-blue-700">{validationHint}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">'''

if old_checklist in text and '<p className="mt-2 text-sm text-blue-700">{validationHint}</p>' not in text:
    text = text.replace(old_checklist, new_checklist)

path.write_text(text)
print("C6C-3 dynamic required fields applied.")
