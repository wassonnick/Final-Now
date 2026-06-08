from pathlib import Path

path = Path("frontend/src/pages/admin/AdminSocietyFormPage.tsx")
text = path.read_text()

# 1. Replace validate() so publish requires score, draft does not.
start = text.find("  const validate = () => {")
end = text.find("\n  const handleSave = async", start)

if start == -1 or end == -1:
    raise SystemExit("Could not find validate block. Upload AdminSocietyFormPage.tsx.")

new_validate = '''  const validate = (mode: "draft" | "publish" = "draft") => {
    if (!society.name.trim()) return "Society name is required.";
    if (!society.slug.trim()) return "SEO slug is required.";
    if (!society.locality.trim() && !society.sector.trim()) {
      return "Add at least one location field: sector or locality.";
    }

    if (mode === "publish" && !String(society.score || "").trim()) {
      return "Society score is required before publishing. Add a score like 8.0 or save as draft.";
    }

    return "";
  };
'''

text = text[:start] + new_validate + text[end:]

# 2. Make handleSave call validate(mode), not validate().
text = text.replace(
'''    const validationError = validate();''',
'''    const validationError = validate(mode);'''
)

# 3. Normalize score before save so backend never receives null.
old_next = '''      const nextSociety: AdminSociety = {
        ...society,
        status: mode === "publish" && society.status === "Draft" ? "Verified" : society.status,
        isPublished: mode === "publish" ? true : society.isPublished,
      };'''

new_next = '''      const nextSociety: AdminSociety = {
        ...society,
        score: String(society.score || "").trim() || "0",
        securityScore: String(society.securityScore || "").trim() || "0",
        maintenanceScore: String(society.maintenanceScore || "").trim() || "0",
        connectivityScore: String(society.connectivityScore || "").trim() || "0",
        lifestyleScore: String(society.lifestyleScore || "").trim() || "0",
        investmentScore: String(society.investmentScore || "").trim() || "0",
        status: mode === "publish" && society.status === "Draft" ? "Verified" : society.status,
        isPublished: mode === "publish" ? true : society.isPublished,
      };'''

if old_next not in text:
    # Try replacing the normalized version if previous patch already changed it
    start2 = text.find("      const nextSociety: AdminSociety = {")
    end2 = text.find("\n      await saveAdminSociety(nextSociety, isEdit);", start2)
    if start2 == -1 or end2 == -1:
      raise SystemExit("Could not find nextSociety block.")
    current_block = text[start2:end2]
    replacement_block = '''      const nextSociety: AdminSociety = {
        ...society,
        slug: society.slug || slugifySociety(society.name),
        score: String(society.score || "").trim() || "0",
        securityScore: String(society.securityScore || "").trim() || "0",
        maintenanceScore: String(society.maintenanceScore || "").trim() || "0",
        connectivityScore: String(society.connectivityScore || "").trim() || "0",
        lifestyleScore: String(society.lifestyleScore || "").trim() || "0",
        investmentScore: String(society.investmentScore || "").trim() || "0",
        status: mode === "publish" && society.status === "Draft" ? "Verified" : society.status,
        isPublished: mode === "publish" ? true : society.isPublished,
        city: society.city || "Gurgaon",
        state: society.state || "Haryana",
        country: society.country || "India",
        amenities: Array.isArray(society.amenities) ? society.amenities : [],
        galleryImages: Array.isArray(society.galleryImages) ? society.galleryImages : [],
      };'''
    text = text.replace(current_block, replacement_block)
else:
    text = text.replace(old_next, new_next)

# 4. Mark score as required before publish in UI.
text = text.replace(
'''                  ["Score", "score"],''',
'''                  ["Score *", "score"],'''
)

# 5. Add clear note under Scores section if not already there.
old_scores_intro = '''              <h2 className="text-xl font-bold tracking-tight text-slate-950">Scores & Market Ranges</h2>
              <p className="mt-1 text-sm text-slate-500">Keep this practical and useful for users.</p>'''

new_scores_intro = '''              <h2 className="text-xl font-bold tracking-tight text-slate-950">Scores & Market Ranges</h2>
              <p className="mt-1 text-sm text-slate-500">Keep this practical and useful for users.</p>
              <p className="mt-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                Score is required before publishing because the live database requires a non-empty society score. Use values like 7.5, 8.0 or 9.2.
              </p>'''

if old_scores_intro in text and "Score is required before publishing" not in text:
    text = text.replace(old_scores_intro, new_scores_intro)

path.write_text(text)
print("C6D-3 society score validation applied.")
