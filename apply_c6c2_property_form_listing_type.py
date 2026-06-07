from pathlib import Path

path = Path("frontend/src/pages/admin/AdminPropertyFormPage.tsx")
text = path.read_text()

# 1. Add helper functions after fieldSummary function.
helper_marker = '''function fieldSummary(label: string, value: string) {
  return value ? `${label}: ${value}` : `${label}: missing`;
}
'''

helper_addition = '''function isRentalListing(listingType: string) {
  return String(listingType || "").toLowerCase().includes("rent");
}

function isSaleListing(listingType: string) {
  const value = String(listingType || "").toLowerCase();
  return value.includes("sale") || value.includes("buy") || value.includes("sell") || value.includes("resale");
}

function pricingLabels(listingType: string) {
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

if helper_marker in text and "function pricingLabels" not in text:
    text = text.replace(helper_marker, helper_marker + "\n" + helper_addition)

# 2. Add computed labels inside component after completion useMemo block.
completion_block = '''  const completion = useMemo(() => {
    const checks = [
      Boolean(property.title.trim()),
      Boolean(property.society),
      Boolean(property.locality),
      Boolean(property.price),
      Boolean(property.bedrooms),
      Boolean(property.areaSqft),
      Boolean(property.description.trim()),
      propertyImages.length > 0,
    ];

    const done = checks.filter(Boolean).length;

    return {
      done,
      total: checks.length,
      percent: Math.round((done / checks.length) * 100),
    };
  }, [property, propertyImages.length]);
'''

pricing_const = '''  const labels = pricingLabels(property.listingType);
  const rentalListing = isRentalListing(property.listingType);
  const saleListing = isSaleListing(property.listingType);
'''

if completion_block in text and "const labels = pricingLabels(property.listingType);" not in text:
    text = text.replace(completion_block, completion_block + "\n" + pricing_const)

# 3. Update summary mode helper text.
text = text.replace(
    '''            <p className="mt-2 text-sm text-blue-600">{property.status}</p>''',
    '''            <p className="mt-2 text-sm text-blue-600">
              {rentalListing ? "Rental listing" : saleListing ? "Sale / resale listing" : property.status}
            </p>'''
)

# 4. Replace pricing section heading copy.
text = text.replace(
    '''              <h2 className="text-xl font-bold tracking-tight text-slate-950">Pricing & Configuration</h2>
              <p className="mt-1 text-sm text-slate-500">
                These fields support rent, resale and seller inventory workflows.
              </p>''',
    '''              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                {rentalListing ? "Rent & Configuration" : "Sale Price & Configuration"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {rentalListing
                  ? "Add rent, deposit and configuration details for rental inventory."
                  : "Add asking price, booking/token amount and configuration details for sale inventory."}
              </p>'''
)

# 5. Replace labels/placeholders for price/deposit/maintenance.
text = text.replace(
    '''                  Price / Rent
                  <Input
                    value={property.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="₹85,000/mo or ₹4.2 Cr"
                  />''',
    '''                  {labels.price}
                  <Input
                    value={property.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder={labels.pricePlaceholder}
                  />'''
)

text = text.replace(
    '''                  Security Deposit
                  <Input
                    value={property.securityDeposit}
                    onChange={(event) => updateField("securityDeposit", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="₹1,70,000"
                  />''',
    '''                  {labels.deposit}
                  <Input
                    value={property.securityDeposit}
                    onChange={(event) => updateField("securityDeposit", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder={labels.depositPlaceholder}
                  />'''
)

text = text.replace(
    '''                  Maintenance
                  <Input
                    value={property.maintenance}
                    onChange={(event) => updateField("maintenance", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder="Included / ₹12,000"
                  />''',
    '''                  {labels.maintenance}
                  <Input
                    value={property.maintenance}
                    onChange={(event) => updateField("maintenance", event.target.value)}
                    className="mt-2 h-12 rounded-2xl border-slate-200"
                    placeholder={labels.maintenancePlaceholder}
                  />'''
)

# 6. Update generated description so it doesn't say rent-like copy for sale.
old_generate = '''  const generateDescription = () => {
    const text = `${property.bedrooms || "Spacious"} BHK ${String(
      property.listingType || "property",
    ).toLowerCase()} listing in ${property.society || "this society"}, ${
      property.locality || "Gurgaon"
    }. Ideal for families and professionals looking for a verified society with strong connectivity, security and lifestyle amenities.`;

    updateField("description", text);
  };
'''

new_generate = '''  const generateDescription = () => {
    const listingKind = rentalListing
      ? "rental home"
      : saleListing
        ? "resale home"
        : "property";

    const audience = rentalListing
      ? "tenants and families looking for verified rental options"
      : "buyers and investors looking for verified resale options";

    const text = `${property.bedrooms || "Spacious"} BHK ${listingKind} in ${property.society || "this society"}, ${
      property.locality || "Gurgaon"
    }. Suitable for ${audience}, with strong society context, connectivity, security and lifestyle amenities.`;

    updateField("description", text);
  };
'''

if old_generate in text:
    text = text.replace(old_generate, new_generate)

# 7. Update checklist price label.
text = text.replace(
    '''                <p>{fieldSummary("Price", property.price)}</p>''',
    '''                <p>{fieldSummary(labels.price, property.price)}</p>'''
)

path.write_text(text)
print("C6C-2 listing type dynamic pricing labels applied.")
