from pathlib import Path

path = Path("frontend/src/pages/admin/AdminPropertyFormPage.tsx")
text = path.read_text()

# 1. Remove hardcoded societies array, but keep localities.
old_societies = '''const societies = [
  "DLF Crest",
  "DLF Park Place",
  "M3M Golf Estate",
  "Tata Primanti",
  "Ireo Victory Valley",
  "Aralias",
];

'''

if old_societies in text:
    text = text.replace(old_societies, "")

# 2. Add society option type after emptyProperty block.
marker = '''const emptyProperty = {
  title: "",
  listingType: "Rent",
  status: "Draft",
  society: "",
  locality: "",
  price: "",
  securityDeposit: "",
  maintenance: "",
  bedrooms: "",
  bathrooms: "",
  areaSqft: "",
  floor: "",
  facing: "North-East",
  furnishedStatus: "Semi Furnished",
  description: "",
  amenities: [] as string[],
  images: [] as string[],
  featured: false,
  verified: false,
};
'''

addition = '''
type SocietyOption = {
  id?: number | string;
  name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  status?: string;
};

function extractSocieties(payload: any): SocietyOption[] {
  const raw = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.data)
      ? payload.data.data
      : [];

  return raw
    .map((item: any) => ({
      id: item.id,
      name: item.name || "",
      slug: item.slug || "",
      sector: item.sector || "",
      locality: item.locality || "",
      status: item.status || "",
    }))
    .filter((item: SocietyOption) => Boolean(item.name))
    .sort((a: SocietyOption, b: SocietyOption) => a.name.localeCompare(b.name));
}

function societyLabel(item: SocietyOption) {
  const location = [item.sector, item.locality].filter(Boolean).join(", ");
  return location ? `${item.name} — ${location}` : item.name;
}
'''

if marker in text and "type SocietyOption" not in text:
    text = text.replace(marker, marker + addition)

# 3. Add live society state after property state.
old_state = '''  const [property, setProperty] = useState(emptyProperty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);'''

new_state = '''  const [property, setProperty] = useState(emptyProperty);
  const [societyOptions, setSocietyOptions] = useState<SocietyOption[]>([]);
  const [societiesLoading, setSocietiesLoading] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);'''

if old_state in text and "societyOptions" not in text:
    text = text.replace(old_state, new_state)

# 4. Add useEffect to load societies before/near loadProperty useEffect.
use_effect_marker = '''  useEffect(() => {
    async function loadProperty() {'''

load_societies_effect = '''  useEffect(() => {
    async function loadSocieties() {
      try {
        setSocietiesLoading(true);

        const response = await adminFetch("/admin/societies");
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(json?.message || "Failed to load societies");
        }

        setSocietyOptions(extractSocieties(json));
      } catch (err) {
        console.error(err);
        setError("Unable to load live societies. You can still type/select if already saved.");
      } finally {
        setSocietiesLoading(false);
      }
    }

    void loadSocieties();
  }, []);

'''

if use_effect_marker in text and "async function loadSocieties()" not in text:
    text = text.replace(use_effect_marker, load_societies_effect + use_effect_marker)

# 5. Add selected society fallback option list inside component after validationHint.
marker2 = '''  const validationHint = requiredFieldHint(property.listingType);'''

addition2 = '''
  const societyDropdownOptions = useMemo(() => {
    const currentSociety = String(property.society || "").trim();
    const exists = societyOptions.some((item) => item.name === currentSociety);

    if (currentSociety && !exists) {
      return [
        {
          name: currentSociety,
          status: "Current",
        },
        ...societyOptions,
      ];
    }

    return societyOptions;
  }, [property.society, societyOptions]);
'''

if marker2 in text and "const societyDropdownOptions = useMemo" not in text:
    text = text.replace(marker2, marker2 + "\n" + addition2)

# 6. Replace society select options.
old_select_options = '''                    <option value="">Select Society</option>
                    {societies.map((item) => (
                      <option key={item}>{item}</option>
                    ))}'''

new_select_options = '''                    <option value="">
                      {societiesLoading ? "Loading societies..." : "Select Society"}
                    </option>
                    {societyDropdownOptions.map((item) => (
                      <option key={`${item.id || item.name}-${item.name}`} value={item.name}>
                        {societyLabel(item)}
                      </option>
                    ))}'''

if old_select_options in text:
    text = text.replace(old_select_options, new_select_options)

# 7. Add helper note under society dropdown.
old_society_label_close = '''                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Locality <span className="text-rose-500">*</span>'''

new_society_label_close = '''                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    {societiesLoading
                      ? "Fetching live societies..."
                      : societyOptions.length
                        ? `${societyOptions.length} live societies loaded`
                        : "No live societies loaded"}
                  </span>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Locality <span className="text-rose-500">*</span>'''

if old_society_label_close in text and "live societies loaded" not in text:
    text = text.replace(old_society_label_close, new_society_label_close)

path.write_text(text)
print("C6C-6 live society dropdown applied.")
