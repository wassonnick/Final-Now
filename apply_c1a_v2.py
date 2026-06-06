from pathlib import Path

path = Path('frontend/src/pages/SocietyPage.tsx')
if not path.exists():
    raise SystemExit('ERROR: Run this from repo root. Could not find frontend/src/pages/SocietyPage.tsx')

text = path.read_text()
original = text

if 'C1A conversion summary cards' in text:
    raise SystemExit('C1A appears to be already applied. No changes made.')

# 1) Add small derived values for conversion labels.
needle = '''  const whyChoose = [\n'''
insert = '''  const rentRange = field(society, "rentRange", "rent_range", "On request");\n  const buyRange = field(society, "buyRange", "buy_range", "On request");\n  const availableHomesLabel = properties.length\n    ? `${properties.length} available home${properties.length === 1 ? "" : "s"}`\n    : "Homes on request";\n  const aiAdvisorUrl = `/ai-advisor?society=${encodeURIComponent(\n    society.name,\n  )}&location=${encodeURIComponent(societyLocation || "Gurgaon")}`;\n\n'''
if needle not in text:
    raise SystemExit('ERROR: Could not find whyChoose marker. No changes made.')
text = text.replace(needle, insert + needle, 1)

# 2) Add Request callback as the first header CTA in the existing CTA row.
cta_marker = '''                  <div className="mt-6 flex flex-wrap gap-3">\n'''
cta_insert = '''                    <Button\n                      onClick={() => setCallbackOpen(true)}\n                      className="rounded-full bg-blue-600 px-6 hover:bg-blue-700"\n                    >\n                      <Phone className="mr-2 h-4 w-4" /> Request callback\n                    </Button>\n'''
idx = text.find(cta_marker)
if idx == -1:
    raise SystemExit('ERROR: Could not find header CTA row. No changes made.')
text = text[:idx + len(cta_marker)] + cta_insert + text[idx + len(cta_marker):]

# 3) Add compact above-the-fold conversion summary cards before the header CTA row.
summary_block = '''                  {/* C1A conversion summary cards */}\n                  <div className="mt-6 grid gap-3 sm:grid-cols-3">\n                    {[\n                      ["Available homes", availableHomesLabel],\n                      ["Rent range", rentRange || "On request"],\n                      ["Buy range", buyRange || "On request"],\n                    ].map(([label, value]) => (\n                      <div\n                        key={label}\n                        className="rounded-2xl border border-navy-100 bg-ivory-50 px-4 py-3"\n                      >\n                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-400">\n                          {label}\n                        </div>\n                        <div className="mt-1 text-sm font-bold text-navy-900">\n                          {value}\n                        </div>\n                      </div>\n                    ))}\n                  </div>\n\n'''
# Insert before the CTA row we just modified.
idx = text.find(cta_marker)
if idx == -1:
    raise SystemExit('ERROR: Could not find header CTA row for summary insert. No changes made.')
text = text[:idx] + summary_block + text[idx:]

# 4) Add AI advisor CTA to the sticky market card after Request callback.
request_callback_button = '''              <Button\n                onClick={() => setCallbackOpen(true)}\n                variant="outline"\n                className="mt-3 w-full rounded-full"\n              >\n                <Phone className="mr-2 h-4 w-4" /> Request callback\n              </Button>\n'''
ai_button = '''              <Button\n                asChild\n                variant="ghost"\n                className="mt-3 w-full rounded-full text-blue-700 hover:bg-blue-50"\n              >\n                <Link to={aiAdvisorUrl}>\n                  <MessageCircle className="mr-2 h-4 w-4" /> Find homes like this\n                </Link>\n              </Button>\n              <p className="mt-4 text-center text-xs leading-5 text-navy-500">\n                SocietyFlats helps compare the society first, then shortlist verified homes.\n              </p>\n'''
if request_callback_button not in text:
    raise SystemExit('ERROR: Could not find sticky Request callback button. No changes made.')
text = text.replace(request_callback_button, request_callback_button + ai_button, 1)

# 5) Add mobile sticky CTA just above the existing PublicLeadModal.
modal_marker = '''      <PublicLeadModal\n'''
mobile_sticky = '''      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">\n        <div className="grid grid-cols-2 gap-3">\n          <Button asChild className="rounded-full bg-navy-600 hover:bg-navy-700">\n            <Link to={`/search?tab=rent&q=${encodeURIComponent(society.name)}`}>\n              View homes\n            </Link>\n          </Button>\n          <Button\n            onClick={() => setCallbackOpen(true)}\n            variant="outline"\n            className="rounded-full"\n          >\n            Callback\n          </Button>\n        </div>\n      </div>\n\n'''
if modal_marker not in text:
    raise SystemExit('ERROR: Could not find PublicLeadModal marker. No changes made.')
text = text.replace(modal_marker, mobile_sticky + modal_marker, 1)

if text == original:
    raise SystemExit('ERROR: No changes were made.')

path.write_text(text)
print('C1A v2 applied successfully to frontend/src/pages/SocietyPage.tsx')
print('Next: cd frontend && npm run build')
