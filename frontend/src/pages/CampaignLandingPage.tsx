import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, MessageCircle, Phone } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import { CAMPAIGNS, type Campaign } from "@/config/campaigns";
import { BRAND_PHONE_DISPLAY, BRAND_PHONE_HREF } from "@/config/contact";
import { setPublicSeo } from "@/lib/seo";

// Generic campaign landing renderer — the Campaigns module's public face.
// Every campaign in config/campaigns.ts gets this page at /go/<slug>.
export function CampaignLandingPage({ slugOverride }: { slugOverride?: string }) {
  const params = useParams();
  const slug = slugOverride || params.slug || "";
  const campaign: Campaign | undefined = CAMPAIGNS[slug];
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    if (campaign) {
      setPublicSeo(campaign.seo.title, campaign.seo.description, { canonical: `/go/${campaign.slug}` });
      window.scrollTo(0, 0);
    }
  }, [campaign]);

  if (!campaign) {
    return (
      <div className="min-h-[60vh] bg-[#F7F4EF] px-5 py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#E7DCCB] bg-white p-8 text-center">
          <h1 className="font-display text-3xl text-[#111827]">This campaign isn't live.</h1>
          <Button asChild className="mt-6 rounded-full bg-[#233B6E] px-6 text-white hover:bg-[#1B2E57]">
            <Link to="/societies">Browse verified societies</Link>
          </Button>
        </div>
      </div>
    );
  }

  const whatsappHref = `https://wa.me/919911886222?text=${encodeURIComponent(campaign.whatsappText)}`;

  return (
    <div className="bg-[#F7F4EF] text-[#1D2939]">
      {/* Hero — dusk navy, matching the brand's launch creative */}
      <section className="bg-gradient-to-b from-[#101B38] to-[#233B6E] px-5 pb-16 pt-12 text-white md:pt-16">
        <div className="mx-auto max-w-[1080px]">
          <div className="flex items-center gap-2.5">
            <BrandMark size={40} className="rounded-[11px]" />
            <span className="font-display text-2xl font-medium">
              Society<span className="text-[#DCE6F7]">Flats</span>
            </span>
          </div>
          <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-[#3A4E80] bg-[#18254A] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#DCE6F7]">
            <Check className="h-3.5 w-3.5" /> {campaign.badge}
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-[40px] font-medium leading-[1.08] text-white md:text-[58px]">
            {campaign.titlePlain} <em className="italic text-[#D9B25F]">{campaign.titleGold}</em>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-7 text-[#DCE6F7]">{campaign.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-[#B08A3E] px-7 text-[15px] font-bold text-[#1C2434] hover:bg-[#C79B4B]">
              <Link to={campaign.primaryCta.href}>
                {campaign.primaryCta.label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-[#3A4E80] bg-transparent px-6 text-[15px] font-bold text-white hover:bg-[#18254A]">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us
              </a>
            </Button>
            <a href={BRAND_PHONE_HREF} className="inline-flex items-center gap-2 px-2 text-sm font-bold text-[#DCE6F7]">
              <Phone className="h-4 w-4" /> {BRAND_PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-[1080px] px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          {campaign.bullets.map((bullet) => (
            <div key={bullet.title} className="rounded-[20px] border border-[#E7DCCB] bg-white p-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FA] text-[#233B6E]">
                <Check className="h-4 w-4 stroke-[3]" />
              </span>
              <h2 className="mt-3 font-display text-xl font-medium text-[#111827]">{bullet.title}</h2>
              <p className="mt-2 text-[14.5px] leading-6 text-[#6A7080]">{bullet.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — a real sequence, numbered honestly */}
      <section className="mx-auto max-w-[1080px] px-5 pb-14">
        <h2 className="font-display text-[30px] font-medium text-[#111827]">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {campaign.steps.map((step, index) => (
            <div key={step.title} className="rounded-[20px] border border-[#E7DCCB] bg-white p-6">
              <span className="font-display text-3xl font-medium text-[#B08A3E]">{index + 1}</span>
              <h3 className="mt-2 text-[17px] font-bold text-[#111827]">{step.title}</h3>
              <p className="mt-2 text-[14.5px] leading-6 text-[#6A7080]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1080px] px-5 pb-16">
        <h2 className="font-display text-[30px] font-medium text-[#111827]">Owners usually ask</h2>
        <div className="mt-4 divide-y divide-[#EEE6DA] rounded-[20px] border border-[#E7DCCB] bg-white px-6">
          {campaign.faq.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer list-none text-[15.5px] font-bold text-[#111827]">{item.question}</summary>
              <p className="mt-2 text-[14.5px] leading-6 text-[#6A7080]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#111827] px-5 py-14 text-white">
        <div className="mx-auto flex max-w-[1080px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-[28px] font-medium">
              List once. <em className="italic text-[#D9B25F]">Reach people who already chose your society.</em>
            </h2>
            <p className="mt-2 text-sm text-[#B7C0CF]">Free for owners · verified enquiries only · help on WhatsApp</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full bg-[#B08A3E] px-7 font-bold text-[#1C2434] hover:bg-[#C79B4B]">
              <Link to={campaign.primaryCta.href}>{campaign.primaryCta.label}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-[#27364E] bg-transparent px-6 font-bold text-white hover:bg-[#1B2536]"
              onClick={() => setLeadOpen(true)}
            >
              Request a callback
            </Button>
          </div>
        </div>
      </section>

      <PublicLeadModal
        open={leadOpen}
        title="We'll call you about your listing"
        subtitle="Tell us how to reach you — a real person from SocietyFlats will help you list."
        source={campaign.leadSource}
        leadIntent="owner_listing"
        defaultMessage={campaign.whatsappText}
        onClose={() => setLeadOpen(false)}
      />
    </div>
  );
}

export default CampaignLandingPage;
