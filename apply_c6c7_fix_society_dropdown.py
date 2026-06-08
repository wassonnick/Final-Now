from pathlib import Path

path = Path("frontend/src/pages/admin/AdminPropertyFormPage.tsx")
text = path.read_text()

# 1. Add societyId to emptyProperty if missing.
text = text.replace(
'''  society: "",
  locality: "",''',
'''  society: "",
  societyId: "",
  locality: "",'''
)

# 2. Update SocietyOption type with better id handling.
text = text.replace(
'''type SocietyOption = {
  id?: number | string;
  name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  status?: string;
};''',
'''type SocietyOption = {
  id?: number | string;
  name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  status?: string;
};'''
)

# 3. Replace extractSocieties to handle more response shapes.
start = text.find("function extractSocieties(payload: any): SocietyOption[] {")
end = text.find("\nfunction societyLabel", start)

if start == -1 or end == -1:
    raise SystemExit("Could not find extractSocieties block. Upload AdminPropertyFormPage.tsx.")

new_extract = r'''function extractSocieties(payload: any): SocietyOption[] {
  const raw =
    Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
          ? payload.data.data
          : Array.isArray(payload?.societies)
            ? payload.societies
            : [];

  return raw
    .map((item: any) => ({
      id: item.id ?? item.value ?? item.society_id,
      name: item.name || item.label || item.society_name || "",
      slug: item.slug || "",
      sector: item.sector || "",
      locality: item.locality || "",
      status: item.status || "",
    }))
    .filter((item: SocietyOption) => Boolean(item.name))
    .sort((a: SocietyOption, b: SocietyOption) => a.name.localeCompare(b.name));
}

function mergeSocietyOptions(existing: SocietyOption[], next: SocietyOption[]) {
  const map = new Map<string, SocietyOption>();

  [...existing, ...next].forEach((item) => {
    const key = String(item.id || item.name).toLowerCase();
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
'''

text = text[:start] + new_extract + text[end:]

# 4. Improve getSocietyName helper and add getSocietyId helper.
if "function getSocietyId(data: any)" not in text:
    text = text.replace(
'''function getSocietyName(data: any): string {
  if (typeof data?.society === "string") return data.society;
  if (data?.society?.name) return data.society.name;
  return data?.society_name || "";
}''',
'''function getSocietyName(data: any): string {
  if (typeof data?.society === "string") return data.society;
  if (data?.society?.name) return data.society.name;
  return data?.society_name || data?.societyName || "";
}

function getSocietyId(data: any): string {
  if (data?.society_id) return String(data.society_id);
  if (data?.societyId) return String(data.societyId);
  if (typeof data?.society === "object" && data?.society?.id) return String(data.society.id);
  return "";
}'''
)

# 5. Add societyId in loadProperty setProperty if missing.
text = text.replace(
'''          society: getSocietyName(data),
          locality: data.locality || "",''',
'''          society: getSocietyName(data),
          societyId: getSocietyId(data),
          locality: data.locality || "",'''
)

# 6. Replace loadSocieties effect with paginated loader.
start = text.find("  useEffect(() => {\n    async function loadSocieties() {")
end = text.find("\n  useEffect(() => {\n    async function loadProperty()", start)

if start == -1 or end == -1:
    raise SystemExit("Could not find loadSocieties effect. Upload AdminPropertyFormPage.tsx.")

new_loader = r'''  useEffect(() => {
    async function loadSocieties() {
      try {
        setSocietiesLoading(true);

        let allSocieties: SocietyOption[] = [];
        const maxPages = 20;

        for (let page = 1; page <= maxPages; page += 1) {
          const response = await adminFetch(`/admin/societies?page=${page}&per_page=100`);
          const json = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(json?.message || "Failed to load societies");
          }

          const pageItems = extractSocieties(json);
          allSocieties = mergeSocietyOptions(allSocieties, pageItems);

          const paginated = json?.data && !Array.isArray(json.data) ? json.data : null;
          const currentPage = Number(paginated?.current_page || page);
          const lastPage = Number(paginated?.last_page || page);
          const hasNext = Boolean(paginated?.next_page_url);

          if (!pageItems.length || currentPage >= lastPage || !hasNext) {
            break;
          }
        }

        setSocietyOptions(allSocieties);
      } catch (err) {
        console.error(err);
        setError("Unable to load all live societies. Existing selected society will still be preserved.");
      } finally {
        setSocietiesLoading(false);
      }
    }

    void loadSocieties();
  }, []);

'''
text = text[:start] + new_loader + text[end:]

# 7. Add effect to restore society name from societyId after options load.
marker = '''  useEffect(() => {
    async function loadProperty() {'''

restore_effect = r'''  useEffect(() => {
    const currentSociety = String((property as any).society || "").trim();
    const currentSocietyId = String((property as any).societyId || "").trim();

    if (currentSociety || !currentSocietyId || !societyOptions.length) return;

    const matched = societyOptions.find((item) => String(item.id || "") === currentSocietyId);
    if (matched?.name) {
      setProperty((current: any) => ({
        ...current,
        society: matched.name,
      }));
    }
  }, [(property as any).society, (property as any).societyId, societyOptions]);

'''
if "currentSocietyId" not in text:
    text = text.replace(marker, restore_effect + marker)

# 8. Update societyDropdownOptions to preserve current society and societyId.
start = text.find("  const societyDropdownOptions = useMemo(() => {")
end = text.find("\n  const publishValidationError", start)

if start != -1 and end != -1:
    new_dropdown = r'''  const societyDropdownOptions = useMemo(() => {
    const currentSociety = String(property.society || "").trim();
    const currentSocietyId = String((property as any).societyId || "").trim();

    const existsByName = societyOptions.some((item) => item.name === currentSociety);
    const existsById = currentSocietyId
      ? societyOptions.some((item) => String(item.id || "") === currentSocietyId)
      : false;

    if (currentSociety && !existsByName) {
      return [
        {
          id: currentSocietyId || "current",
          name: currentSociety,
          status: "Current",
        },
        ...societyOptions,
      ];
    }

    if (!currentSociety && currentSocietyId && !existsById) {
      return [
        {
          id: currentSocietyId,
          name: `Saved society #${currentSocietyId}`,
          status: "Current",
        },
        ...societyOptions,
      ];
    }

    return societyOptions;
  }, [property.society, (property as any).societyId, societyOptions]);

'''
    text = text[:start] + new_dropdown + text[end:]

# 9. Update society select onChange to also store societyId.
old_onchange = '''                    onChange={(event) => updateField("society", event.target.value)}'''
new_onchange = '''                    onChange={(event) => {
                      const selectedName = event.target.value;
                      const selectedOption = societyDropdownOptions.find((item) => item.name === selectedName);
                      setProperty((current: any) => ({
                        ...current,
                        society: selectedName,
                        societyId: selectedOption?.id ? String(selectedOption.id) : "",
                      }));
                      if (error) setError("");
                      if (success) setSuccess("");
                    }}'''

text = text.replace(old_onchange, new_onchange)

# 10. Update payload to include society_id if present without removing society name.
text = text.replace(
'''        society: property.society,
        locality: property.locality,''',
'''        society: property.society,
        society_id: (property as any).societyId || undefined,
        locality: property.locality,'''
)

path.write_text(text)
print("C6C-7 fixed live society dropdown pagination and edit selection.")
