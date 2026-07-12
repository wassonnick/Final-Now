// C84 admin feature hub UX polish: compact owner/broker CRM cards and actions, workflows unchanged.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDot,
  LineChart,
  MapPinned,
  MessageSquareText,
  Search,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react';

import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { fetchAdminLeads } from '@/lib/adminLeadStore';
import type { AdminLead } from '@/lib/adminLeadStore';

type FeatureKey =
  | 'ai'
  | 'maps'
  | 'broker-crm' | 'owner-crm'
  | 'chat'
  | 'analytics'
  | 'advanced-search'
  | 'recommendations';

type FeatureConfig = {
  title: string;
  subtitle: string;
  icon: typeof Bot;
  status: string;
  summary: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  actions?: Array<{
    label: string;
    href: string;
  }>;
  metrics: Array<{
    label: string;
    value: string;
    note: string;
  }>;
  workflows: string[];
  connected: string[];
  pending: string[];
  nextBuild: string[];
};

const featureConfigs: Record<FeatureKey, FeatureConfig> = {
  ai: {
    title: 'AI Features',
    subtitle: 'Drafting, extraction and admin review tools',
    icon: Bot,
    status: 'Foundation live',
    summary:
      'Use AI-assisted workflows for society profile drafts, brochure extraction, SEO copy, FAQ ideas and lead response drafts. Output must stay in admin review until verified.',
    primaryAction: {
      label: 'Auto import societies',
      href: '/admin/verified-society-importer',
    },
    metrics: [
      { label: 'Society creation', value: 'URL first', note: 'Official page to draft profile' },
      { label: 'Image safety', value: 'Review only', note: 'Public image remains placeholder' },
      { label: 'Verification', value: 'Admin gated', note: 'AI never marks verified alone' },
    ],
    workflows: [
      'Fetch project page and create editable society draft',
      'Upload brochure PDF to fill missing factual fields',
      'Generate SEO title, meta description and FAQ draft',
      'Prepare lead reply and callback notes for admins',
    ],
    connected: [
      'Official URL fetch workflow',
      'Brochure PDF extraction workflow',
      'Image reference and approval guardrails',
    ],
    pending: [
      'OpenAI API key based copy assistant',
      'Admin prompt controls and audit history',
      'Bulk AI quality queue for imported societies',
    ],
    nextBuild: [
      'Add AI draft history per society',
      'Add one-click FAQ generation inside society edit',
      'Add lead response generator inside lead detail',
    ],
  },
  maps: {
    title: 'Maps',
    subtitle: 'Location pins, nearby intelligence and locality quality',
    icon: MapPinned,
    status: 'Ready for API keys',
    summary:
      'Maps workspace keeps map pins, Google URLs, nearby schools, metro, hospitals and office hubs in one verification queue.',
    primaryAction: {
      label: 'Open societies',
      href: '/admin/societies',
    },
    metrics: [
      { label: 'Pin source', value: 'Manual safe', note: 'Coordinates need admin review' },
      { label: 'Nearby data', value: 'Structured', note: 'Stored on society profile' },
      { label: 'Public links', value: 'Subtle', note: 'SocietyFlats stays primary' },
    ],
    workflows: [
      'Verify society map pin before publishing',
      'Store Google Maps URL and place metadata',
      'Fill nearby schools, metro, hospitals and office hubs',
      'Flag profiles where coordinates are missing',
    ],
    connected: [
      'Google Maps URL fields',
      'Latitude and longitude fields',
      'Nearby intelligence fields',
    ],
    pending: [
      'Google Places API key',
      'Pin confidence scoring',
      'Map-based admin review queue',
    ],
    nextBuild: [
      'Add missing-map filter on societies list',
      'Add Places lookup from society edit',
      'Add map preview beside coordinates',
    ],
  },
  'owner-crm': {
    title: 'Owner CRM',
    subtitle: 'Inventory workspace for owner listing leads',
    icon: BriefcaseBusiness,
    status: 'Owner queue live',
    summary:
      'Owner CRM organizes property owner submissions, verification, pricing follow-ups and inventory activation.',
    primaryAction: {
      label: 'Open Owner Leads',
      href: '/admin/leads?view=owner',
    },
    actions: [
      {
        label: 'Open Broker CRM',
        href: '/admin/broker-crm',
      },
      {
        label: 'Open All Leads',
        href: '/admin/leads',
      },
    ],
    metrics: [
      { label: 'Owner leads', value: 'Live filter', note: 'Open owner inventory submissions' },
      { label: 'Verification', value: 'CRM ready', note: 'Check ownership, price and photos' },
      { label: 'Activation', value: 'Lead detail', note: 'Mark owner active after verification' },
    ],
    workflows: [
      'Track owner listing submissions',
      'Verify ownership and society details',
      'Confirm expected rent or sale price',
      'Request photos and activate inventory',
    ],
    connected: [
      'Sell page owner form',
      'Admin leads list',
      'Lead detail page',
    ],
    pending: [
      'Owner document/photo upload',
      'Inventory activation workflow',
      'Owner communication templates',
    ],
    nextBuild: [
      'Use Owner Leads filter for owner inventory',
      'Add owner verification checklist',
      'Connect owner lead to property creation later',
    ],
  },
  'broker-crm': {
    title: 'Broker CRM',
    subtitle: 'Pipeline workspace for leads, inventory and follow-ups',
    icon: BriefcaseBusiness,
    status: 'Lead foundation live',
    summary:
      'Broker CRM organizes buyer, tenant, owner and broker conversations around lead status, property interest and next follow-up.',
    primaryAction: {
      label: 'Open Broker Leads',
      href: '/admin/leads?view=broker',
    },
    actions: [
      {
        label: 'Open Owner Leads',
        href: '/admin/leads?view=owner',
      },
      {
        label: 'Open All Leads',
        href: '/admin/leads',
      },
    ],
    metrics: [
      { label: 'Broker leads', value: 'Live filter', note: 'Open broker partner enquiries' },
      { label: 'Owner leads', value: 'Live filter', note: 'Open owner inventory submissions' },
      { label: 'Follow-up', value: 'CRM ready', note: 'Use status, priority and next action' },
    ],
    workflows: [
      'Track inquiry source and property/society interest',
      'Assign leads to broker or internal admin',
      'Set callback time and next action',
      'Convert qualified lead to property visit',
    ],
    connected: [
      'Admin leads list',
      'Lead detail page',
      'Property and society context',
    ],
    pending: [
      'Broker onboarding source polishing',
      'Broker assignment owner field',
      'Public partner form conversion polish',
    ],
    nextBuild: [
      'Use Broker Leads filter for partner enquiries',
      'Use Owner Leads filter for owner inventory',
      'Add broker assignment and commission tracking later',
    ],
  },
  chat: {
    title: 'Chat',
    subtitle: 'Conversation inbox for website and WhatsApp leads',
    icon: MessageSquareText,
    status: 'Workflow planned',
    summary:
      'Chat will route visitor messages into leads, keep reply templates ready and preserve conversation context for admins.',
    primaryAction: {
      label: 'Open leads',
      href: '/admin/leads',
    },
    metrics: [
      { label: 'Inbox', value: 'Planned', note: 'No live chat provider connected' },
      { label: 'WhatsApp', value: 'CTA ready', note: 'Public CTA can route to lead flow' },
      { label: 'Templates', value: 'Next', note: 'Admin reply snippets' },
    ],
    workflows: [
      'Capture visitor message with property or society context',
      'Create or update a lead record',
      'Use approved reply templates',
      'Escalate hot leads to broker CRM',
    ],
    connected: [
      'Lead capture destination',
      'Admin lead detail destination',
    ],
    pending: [
      'Chat provider or WhatsApp Cloud API',
      'Message table',
      'Admin inbox UI',
    ],
    nextBuild: [
      'Add chat messages table',
      'Add inbox route with unread filters',
      'Add WhatsApp template library',
    ],
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Inventory health, enrichment quality and conversion view',
    icon: LineChart,
    status: 'Admin shell live',
    summary:
      'Analytics focuses on live inventory, source confidence, missing data, lead movement and publish readiness without fake vanity numbers.',
    primaryAction: {
      label: 'Open dashboard',
      href: '/admin/dashboard',
    },
    metrics: [
      { label: 'Counts', value: 'Real only', note: 'Dashboard avoids fake modules' },
      { label: 'Quality', value: 'Source based', note: 'Confidence score available' },
      { label: 'Exports', value: 'Next', note: 'CSV reporting planned' },
    ],
    workflows: [
      'Monitor live vs draft inventory',
      'Track societies needing manual verification',
      'Review URL and brochure enrichment outcomes',
      'Audit image approval status before publishing',
    ],
    connected: [
      'Admin dashboard',
      'Society source confidence',
      'Published and draft status fields',
    ],
    pending: [
      'Analytics summary API',
      'Lead conversion charts',
      'Weekly quality export',
    ],
    nextBuild: [
      'Add source quality chart',
      'Add missing-fields report',
      'Add lead conversion dashboard',
    ],
  },
  'advanced-search': {
    title: 'Advanced Search',
    subtitle: 'Filters, ranking and saved search foundations',
    icon: Search,
    status: 'Public search exists',
    summary:
      'Advanced search will combine society, property, locality, budget, configuration, amenities and publish status filters for public and admin users.',
    primaryAction: {
      label: 'Open public search',
      href: '/search',
    },
    metrics: [
      { label: 'Search route', value: 'Live', note: 'Public search page exists' },
      { label: 'Admin filters', value: 'Partial', note: 'List pages have basic filters' },
      { label: 'Saved searches', value: 'Backend ready', note: 'Needs UI polish' },
    ],
    workflows: [
      'Search by locality, society, developer and property title',
      'Filter by budget, type, status and amenities',
      'Sort by relevance, price and newest',
      'Save high-intent searches to CRM',
    ],
    connected: [
      'Public search page',
      'Search API controller',
      'Societies and properties lists',
    ],
    pending: [
      'Unified admin search command center',
      'Saved search UI',
      'Ranking weights and typo tolerance',
    ],
    nextBuild: [
      'Add advanced filter drawer',
      'Add admin global search results',
      'Connect saved searches to leads',
    ],
  },
  recommendations: {
    title: 'Recommendation Engine',
    subtitle: 'Match users to societies and available properties',
    icon: Target,
    status: 'Rules foundation',
    summary:
      'Recommendations should rank societies and listings by budget, commute, lifestyle, family needs, inventory availability and verified data quality.',
    primaryAction: {
      label: 'Open AI advisor',
      href: '/ai-advisor',
    },
    metrics: [
      { label: 'Inputs', value: 'Defined', note: 'Budget, location and amenities' },
      { label: 'Scoring', value: 'To refine', note: 'Use verified fields only' },
      { label: 'Output', value: 'Reviewable', note: 'Admin can inspect logic' },
    ],
    workflows: [
      'Capture user needs from AI advisor or search',
      'Score societies by fit and confidence',
      'Prefer live public listings',
      'Send matched leads into Broker CRM',
    ],
    connected: [
      'AI advisor page',
      'Search API',
      'Society score fields',
    ],
    pending: [
      'Recommendation scoring API',
      'Explainability notes',
      'Lead-to-listing matching history',
    ],
    nextBuild: [
      'Add weighted recommendation endpoint',
      'Add admin tuning controls',
      'Show why each match was recommended',
    ],
  },
};

type AdminFeatureHubPageProps = {
  feature: FeatureKey;
};

function StatusList({ title, items, done = false }: { title: string; items: string[]; done?: boolean }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 text-sm text-slate-600">
            {done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            )}
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}


function cleanLeadPhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function leadPhoneHref(value?: string) {
  const digits = cleanLeadPhone(value);
  return digits ? `tel:${digits}` : "";
}

function leadWhatsAppHref(lead: AdminLead) {
  const digits = cleanLeadPhone(lead.phone);
  if (!digits) return "";

  const phone = digits.length === 10 ? `91${digits}` : digits;
  const message = encodeURIComponent(
    `Hi ${lead.name || "there"}, this is SocietyFlats regarding your ${lead.requirement || "enquiry"}.`,
  );

  return `https://wa.me/${phone}?text=${message}`;
}

function isBrokerLead(lead: AdminLead) {
  const value = String(lead.source || '').toLowerCase();

  return (
    value.includes('broker') ||
    value.includes('partner') ||
    value.includes('agent') ||
    value.includes('crm_intake') ||
    value.includes('public_broker_crm')
  );
}


function displayBrokerCrmStatus(lead: AdminLead) {
  if (isBrokerLead(lead)) {
    if (lead.status === "Booked") return "Active Partner";
    if (lead.status === "Lost") return "Not Suitable";
  }

  return lead.status;
}


function brokerPartnerStep(lead: AdminLead) {
  if (lead.status === "Booked") return "Active partner";
  if (lead.status === "Lost") return "Not suitable";
  if (lead.status === "Negotiation") return "Commission discussion";
  if (lead.status === "Contacted") return "Verification started";
  if (lead.status === "Site Visit") return "Field verification";
  return "New partner enquiry";
}

function brokerPartnerArea(lead: AdminLead) {
  return lead.society || lead.property || "Area not specified";
}

function brokerPartnerPriorityLabel(lead: AdminLead) {
  if (lead.priority === "Hot") return "High potential";
  if (lead.priority === "Cold") return "Low priority";
  return "Needs review";
}



function brokerPartnerFilterMatches(lead: AdminLead, filter: string) {
  if (filter === "all") return true;
  if (filter === "new") return lead.status === "New";
  if (filter === "verification") return lead.status === "Contacted" || lead.status === "Site Visit";
  if (filter === "commission") return lead.status === "Negotiation";
  if (filter === "active") return lead.status === "Booked";
  if (filter === "not_suitable") return lead.status === "Lost";

  return true;
}

function brokerPartnerFilterLabel(filter: string) {
  if (filter === "new") return "New";
  if (filter === "verification") return "Verification";
  if (filter === "commission") return "Commission";
  if (filter === "active") return "Active";
  if (filter === "not_suitable") return "Not Suitable";

  return "All";
}

function brokerPartnerMetrics(leads: AdminLead[]) {
  return {
    total: leads.length,
    newPartners: leads.filter((lead) => lead.status === "New").length,
    verificationStarted: leads.filter((lead) => lead.status === "Contacted" || lead.status === "Site Visit").length,
    commissionDiscussion: leads.filter((lead) => lead.status === "Negotiation").length,
    activePartners: leads.filter((lead) => lead.status === "Booked").length,
    notSuitable: leads.filter((lead) => lead.status === "Lost").length,
  };
}

function BrokerCrmLiveLeads() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [linkedProperties, setLinkedProperties] = useState<OwnerLinkedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerFilter, setPartnerFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    fetchAdminLeads()
      .then((items) => {
        if (mounted) {
          setLeads(items);
        }
      })
      .catch((error) => {
        console.error('Could not load broker CRM leads:', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const brokerLeads = useMemo(() => leads.filter(isBrokerLead), [leads]);
  const filteredBrokerLeads = useMemo(
    () => brokerLeads.filter((lead) => brokerPartnerFilterMatches(lead, partnerFilter)),
    [brokerLeads, partnerFilter],
  );
  const visibleLeads = filteredBrokerLeads.slice(0, 6);
  const metrics = brokerPartnerMetrics(brokerLeads);

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Live broker queue</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Broker partner leads
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Partner, broker and agent enquiries pulled directly from the main Leads CRM.
          </p>
        </div>

        <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
          <Link to="/admin/leads?view=broker">
            Open full broker queue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["New Partners", metrics.newPartners, "Fresh partner enquiries"],
          ["Verification", metrics.verificationStarted, "Contacted / field check"],
          ["Commission", metrics.commissionDiscussion, "Terms discussion"],
          ["Active Partners", metrics.activePartners, "Ready to work"],
          ["Not Suitable", metrics.notSuitable, "Rejected / inactive"],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 md:p-4">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["all", "All", metrics.total],
          ["new", "New", metrics.newPartners],
          ["verification", "Verification", metrics.verificationStarted],
          ["commission", "Commission", metrics.commissionDiscussion],
          ["active", "Active", metrics.activePartners],
          ["not_suitable", "Not Suitable", metrics.notSuitable],
        ].map(([value, label, count]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setPartnerFilter(String(value))}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              partnerFilter === value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-slate-600">
          Showing {visibleLeads.length} {brokerPartnerFilterLabel(partnerFilter).toLowerCase()} partner lead{visibleLeads.length === 1 ? "" : "s"}
        </p>
        {partnerFilter !== "all" ? (
          <button
            type="button"
            onClick={() => setPartnerFilter("all")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-500">
            Loading broker leads...
          </div>
        ) : visibleLeads.length ? (
          visibleLeads.map((lead) => (
            <div key={lead.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{lead.name || 'Unnamed lead'}</p>
                  <p className="mt-1 text-xs text-slate-500">{lead.phone || 'No phone'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                  Broker
                </span>
              </div>

              <div className="mt-3 rounded-2xl bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">{brokerPartnerArea(lead)}</p>
                <p className="mt-1 text-xs text-slate-500">Broker partner onboarding</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {displayBrokerCrmStatus(lead)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {brokerPartnerPriorityLabel(lead)}
                </span>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-600">{brokerPartnerStep(lead)}</p>
              <p className="mt-1 text-xs text-slate-400">Assigned: {lead.assignedTo || 'Unassigned'}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
                <Button asChild variant="outline" size="sm" className="rounded-full px-3 text-xs">
                  <Link to={`/admin/leads/${lead.id}`}>Open</Link>
                </Button>
                {leadPhoneHref(lead.phone) ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full px-3 text-xs">
                    <a href={leadPhoneHref(lead.phone)}>Call</a>
                  </Button>
                ) : null}
                {leadWhatsAppHref(lead) ? (
                  <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 px-3 text-xs text-emerald-700">
                    <a href={leadWhatsAppHref(lead)} target="_blank" rel="noreferrer">WhatsApp</a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-500">
            No {brokerPartnerFilterLabel(partnerFilter).toLowerCase()} broker partner leads found.
          </div>
        )}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
        <div className="grid min-w-[760px] grid-cols-[1.1fr_1fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          <span>Lead</span>
          <span>Interest</span>
          <span>Partner stage</span>
          <span>Profile</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm font-medium text-slate-500">Loading broker leads...</div>
        ) : visibleLeads.length ? (
          <div className="divide-y divide-slate-100">
            {visibleLeads.map((lead) => {
              return (
              <div key={lead.id} className="grid min-w-[760px] grid-cols-[1.1fr_1fr_0.9fr_0.8fr] gap-4 px-4 py-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-950">{lead.name || 'Unnamed lead'}</p>
                  <p className="mt-1 text-slate-500">{lead.phone || 'No phone'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                      Broker partner
                    </span>
                    <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {brokerPartnerPriorityLabel(lead)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-slate-800">
                    {brokerPartnerArea(lead)}
                  </p>
                  <p className="mt-1 text-slate-500">
                    Broker partner onboarding
                  </p>
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {displayBrokerCrmStatus(lead)}
                  </span>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    {brokerPartnerStep(lead)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Assigned: {lead.assignedTo || 'Unassigned'}
                  </p>
                </div>

                <div>
                  <div className="flex min-w-[170px] flex-col gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-full border-blue-200 text-xs font-bold text-blue-700 md:text-sm">
                      <Link to={`/admin/leads/${lead.id}`}>Open lead</Link>
                    </Button>

                    {leadPhoneHref(lead.phone) ? (
                      <Button asChild variant="outline" size="sm" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
                        <a href={leadPhoneHref(lead.phone)}>Call</a>
                      </Button>
                    ) : null}

                    {leadWhatsAppHref(lead) ? (
                      <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 text-xs font-bold text-emerald-700 md:text-sm">
                        <a href={leadWhatsAppHref(lead)} target="_blank" rel="noreferrer">WhatsApp</a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-8 text-sm font-medium text-slate-500">
            No {brokerPartnerFilterLabel(partnerFilter).toLowerCase()} broker partner leads found.
          </div>
        )}
      </div>
    </section>
  );
}


function isOwnerLead(lead: AdminLead) {
  const value = String(lead.source || '').toLowerCase();

  return (
    value.includes('owner') ||
    value.includes('sell') ||
    value.includes('seller') ||
    value.includes('listing_submission') ||
    value.includes('list_property')
  );
}

function displayOwnerCrmStatus(lead: AdminLead) {
  if (isOwnerLead(lead)) {
    if (lead.status === "Booked") return "Owner Active";
    if (lead.status === "Lost") return "Inactive Owner";
  }

  return lead.status;
}


type OwnerLinkedProperty = {
  id?: number | string;
  source_lead_id?: number | string | null;
  title?: string;
  status?: string;
  description?: string;
  slug?: string;
};

function isPropertyLinkedToOwnerLead(property: OwnerLinkedProperty, leadId: number | string) {
  if (property.source_lead_id && String(property.source_lead_id) === String(leadId)) {
    return true;
  }

  const text = String(property.description || "").toLowerCase();
  return text.includes(`source lead id: ${String(leadId).toLowerCase()}`);
}



function linkedOwnerDraftForLead(properties: OwnerLinkedProperty[], lead: AdminLead) {
  const apiLinked = lead.linkedProperties?.find((property) =>
    ["Draft", "Verification"].includes(String(property.status || ""))
  );

  if (apiLinked) return apiLinked;

  return properties.find((property) =>
    isPropertyLinkedToOwnerLead(property, lead.id) &&
    ["Draft", "Verification"].includes(String(property.status || ""))
  );
}

function linkedOwnerLiveForLead(properties: OwnerLinkedProperty[], lead: AdminLead) {
  const apiLinked = lead.linkedProperties?.find((property) =>
    String(property.status || "") === "Live"
  );

  if (apiLinked) return apiLinked;

  return properties.find((property) =>
    isPropertyLinkedToOwnerLead(property, lead.id) &&
    String(property.status || "") === "Live"
  );
}

function ownerDraftPropertyUrlFromLead(lead: AdminLead) {
  const params = new URLSearchParams();

  if (lead.name) params.set("ownerName", lead.name);
  if (lead.phone) params.set("ownerPhone", lead.phone);
  if (lead.society) params.set("society", lead.society);
  if (lead.property) params.set("property", lead.property);
  if (lead.budget) params.set("expectedPrice", lead.budget);
  if (lead.requirement) params.set("requirement", lead.requirement);
  params.set("sourceLeadId", String(lead.id));

  return `/admin/properties/new?${params.toString()}`;
}


function ownerLeadMessageValue(lead: AdminLead, label: string) {
  const message = String((lead as AdminLead & { message?: string }).message || "");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = message.match(new RegExp(`${escapedLabel}:\\s*(.+)`, "i"));

  return match?.[1]?.trim() || "";
}

function ownerListingSnapshot(lead: AdminLead) {
  const value = (label: string) => {
    const result = ownerLeadMessageValue(lead, label);
    return result && result.toLowerCase() !== "not provided" ? result : "";
  };

  return {
    bhk: value("BHK"),
    size: value("Size"),
    floor: value("Floor"),
    furnishing: value("Furnishing"),
    availability: value("Availability"),
    expected: lead.budget || value("Expected rent") || value("Expected sale price"),
    preferredTime: value("Preferred callback time"),
  };
}

function ownerListingSnapshotItems(lead: AdminLead) {
  const snapshot = ownerListingSnapshot(lead);

  return [
    ["BHK", snapshot.bhk],
    ["Size", snapshot.size],
    ["Floor", snapshot.floor],
    ["Furnishing", snapshot.furnishing],
    ["Available", snapshot.availability],
    ["Expected", snapshot.expected],
    ["Best time", snapshot.preferredTime],
  ].filter(([, value]) => Boolean(value));
}

function ownerInventoryStage(lead: AdminLead) {
  if (lead.status === "Booked") return "Inventory active";
  if (lead.status === "Lost") return "Inactive owner";
  if (lead.status === "Negotiation") return "Price confirmation";
  if (lead.status === "Contacted") return "Ownership verification";
  if (lead.status === "Site Visit") return "Photo / property check";
  return "New owner submission";
}

function ownerInventoryArea(lead: AdminLead) {
  return lead.society || lead.property || "Society not specified";
}

function ownerInventoryMetrics(leads: AdminLead[]) {
  return {
    total: leads.length,
    newOwners: leads.filter((lead) => lead.status === "New").length,
    verification: leads.filter((lead) => lead.status === "Contacted" || lead.status === "Site Visit").length,
    priceConfirmation: leads.filter((lead) => lead.status === "Negotiation").length,
    activeInventory: leads.filter((lead) => lead.status === "Booked").length,
    inactive: leads.filter((lead) => lead.status === "Lost").length,
  };
}

function ownerFilterMatches(lead: AdminLead, filter: string) {
  if (filter === "all") return true;
  if (filter === "new") return lead.status === "New";
  if (filter === "verification") return lead.status === "Contacted" || lead.status === "Site Visit";
  if (filter === "price") return lead.status === "Negotiation";
  if (filter === "active") return lead.status === "Booked";
  if (filter === "inactive") return lead.status === "Lost";

  return true;
}

function ownerFilterLabel(filter: string) {
  if (filter === "new") return "New";
  if (filter === "verification") return "Verification";
  if (filter === "price") return "Price";
  if (filter === "active") return "Active";
  if (filter === "inactive") return "Inactive";

  return "All";
}

function OwnerCrmLiveLeads() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [linkedProperties, setLinkedProperties] = useState<OwnerLinkedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    fetchAdminLeads()
      .then((items) => {
        if (mounted) {
          setLeads(items);
        }
      })
      .catch((error) => {
        console.error('Could not load owner CRM leads:', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const ownerLeads = useMemo(() => leads.filter(isOwnerLead), [leads]);
  const filteredOwnerLeads = useMemo(
    () => ownerLeads.filter((lead) => ownerFilterMatches(lead, ownerFilter)),
    [ownerLeads, ownerFilter],
  );
  const visibleLeads = filteredOwnerLeads.slice(0, 6);
  const metrics = ownerInventoryMetrics(ownerLeads);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Live owner queue</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Owner inventory leads
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Owner listing submissions pulled directly from the main Leads CRM.
          </p>
        </div>

        <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
          <Link to="/admin/leads?view=owner">
            Open full owner queue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["New Owners", metrics.newOwners, "Fresh submissions"],
          ["Verification", metrics.verification, "Ownership / photos"],
          ["Price", metrics.priceConfirmation, "Rent / sale discussion"],
          ["Active Inventory", metrics.activeInventory, "Ready to work"],
          ["Inactive", metrics.inactive, "Rejected / inactive"],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 md:p-4">
            <p className="text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["all", "All", metrics.total],
          ["new", "New", metrics.newOwners],
          ["verification", "Verification", metrics.verification],
          ["price", "Price", metrics.priceConfirmation],
          ["active", "Active", metrics.activeInventory],
          ["inactive", "Inactive", metrics.inactive],
        ].map(([value, label, count]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setOwnerFilter(String(value))}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              ownerFilter === value
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-slate-600">
          Showing {visibleLeads.length} {ownerFilterLabel(ownerFilter).toLowerCase()} owner lead{visibleLeads.length === 1 ? "" : "s"}
        </p>
        {ownerFilter !== "all" ? (
          <button
            type="button"
            onClick={() => setOwnerFilter("all")}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:hidden">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-500">
            Loading owner leads...
          </div>
        ) : visibleLeads.length ? (
          visibleLeads.map((lead) => {
            const draftProperty = linkedOwnerDraftForLead(linkedProperties, lead);
            const liveProperty = linkedOwnerLiveForLead(linkedProperties, lead);
            const inventoryHref = draftProperty
              ? `/admin/properties/${draftProperty.id}/edit`
              : liveProperty
                ? `/property/${liveProperty.slug || liveProperty.id}`
                : ownerDraftPropertyUrlFromLead(lead);

            const inventoryLabel = draftProperty
              ? "Open draft"
              : liveProperty
                ? "View published"
                : "Create property draft";

            return (
              <div key={lead.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{lead.name || 'Unnamed owner'}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.phone || 'No phone'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Owner
                  </span>
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">{ownerInventoryArea(lead)}</p>
                  <p className="mt-1 text-xs text-slate-500">{lead.requirement || 'Owner inventory submission'}</p>

                  {ownerListingSnapshotItems(lead).length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ownerListingSnapshotItems(lead).slice(0, 6).map(([label, value]) => (
                        <div key={`${lead.id}-${label}`} className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                          <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {displayOwnerCrmStatus(lead)}
                  </span>
                  {draftProperty ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Draft Created</span>
                  ) : liveProperty ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Published</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Draft Pending</span>
                  )}
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-600">{ownerInventoryStage(lead)}</p>
                <p className="mt-1 text-xs text-slate-400">Assigned: {lead.assignedTo || 'Unassigned'}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                  <Button asChild variant="outline" size="sm" className="rounded-full px-3 text-xs">
                    <Link to={`/admin/leads/${lead.id}`}>Open lead</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 bg-emerald-50 px-3 text-xs text-emerald-700">
                    <Link to={inventoryHref}>{inventoryLabel}</Link>
                  </Button>
                  {leadPhoneHref(lead.phone) ? (
                    <Button asChild variant="outline" size="sm" className="rounded-full px-3 text-xs">
                      <a href={leadPhoneHref(lead.phone)}>Call</a>
                    </Button>
                  ) : null}
                  {leadWhatsAppHref(lead) ? (
                    <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 px-3 text-xs text-emerald-700">
                      <a href={leadWhatsAppHref(lead)} target="_blank" rel="noreferrer">WhatsApp</a>
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-500">
            No {ownerFilterLabel(ownerFilter).toLowerCase()} owner leads found.
          </div>
        )}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
        <div className="grid min-w-[760px] grid-cols-[1.1fr_1fr_0.9fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          <span>Owner</span>
          <span>Inventory</span>
          <span>Stage</span>
          <span>Profile</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm font-medium text-slate-500">Loading owner leads...</div>
        ) : visibleLeads.length ? (
          <div className="divide-y divide-slate-100">
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="grid min-w-[760px] grid-cols-[1.1fr_1fr_0.9fr_0.8fr] gap-4 px-4 py-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-950">{lead.name || 'Unnamed owner'}</p>
                  <p className="mt-1 text-slate-500">{lead.phone || 'No phone'}</p>
                  <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    Owner listing
                  </span>
                </div>

                <div>
                  <p className="font-medium text-slate-800">
                    {ownerInventoryArea(lead)}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {lead.requirement || 'Owner inventory submission'}
                  </p>

                  {ownerListingSnapshotItems(lead).length ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {ownerListingSnapshotItems(lead).slice(0, 6).map(([label, value]) => (
                        <div key={`${lead.id}-desktop-${label}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                          <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {displayOwnerCrmStatus(lead)}
                  </span>
                  {linkedOwnerDraftForLead(linkedProperties, lead) ? (
                    <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      Draft Created
                    </span>
                  ) : linkedOwnerLiveForLead(linkedProperties, lead) ? (
                    <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Published
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      Draft Pending
                    </span>
                  )}
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    {ownerInventoryStage(lead)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Assigned: {lead.assignedTo || 'Unassigned'}
                  </p>
                </div>

                <div>
                  <div className="flex min-w-[170px] flex-col gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-full border-blue-200 text-xs font-bold text-blue-700 md:text-sm">
                      <Link to={`/admin/leads/${lead.id}`}>Open lead</Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <Link
                        to={
                          linkedOwnerDraftForLead(linkedProperties, lead)
                            ? `/admin/properties/${linkedOwnerDraftForLead(linkedProperties, lead)?.id}/edit`
                            : linkedOwnerLiveForLead(linkedProperties, lead)
                              ? `/property/${linkedOwnerLiveForLead(linkedProperties, lead)?.slug || linkedOwnerLiveForLead(linkedProperties, lead)?.id}`
                              : ownerDraftPropertyUrlFromLead(lead)
                        }
                      >
                        {linkedOwnerDraftForLead(linkedProperties, lead)
                          ? "Open draft"
                          : linkedOwnerLiveForLead(linkedProperties, lead)
                            ? "View published"
                            : "Create property draft"}
                      </Link>
                    </Button>

                    {leadPhoneHref(lead.phone) ? (
                      <Button asChild variant="outline" size="sm" className="rounded-full border-slate-200 text-xs font-bold md:text-sm">
                        <a href={leadPhoneHref(lead.phone)}>Call</a>
                      </Button>
                    ) : null}

                    {leadWhatsAppHref(lead) ? (
                      <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 text-xs font-bold text-emerald-700 md:text-sm">
                        <a href={leadWhatsAppHref(lead)} target="_blank" rel="noreferrer">WhatsApp</a>
                      </Button>
                    ) : null}

                    <p className="text-[11px] leading-4 text-slate-400">
                      {linkedOwnerDraftForLead(linkedProperties, lead)
                        ? "Draft property already linked to this owner lead for traceability."
                        : linkedOwnerLiveForLead(linkedProperties, lead)
                          ? "Property is published from this owner lead."
                          : "Creates a draft linked to this owner lead for traceability."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-sm font-medium text-slate-500">
            No {ownerFilterLabel(ownerFilter).toLowerCase()} owner leads found.
          </div>
        )}
      </div>
    </section>
  );
}


export function AdminFeatureHubPage({ feature }: AdminFeatureHubPageProps) {
  const config = featureConfigs[feature];
  const Icon = config.icon;

  return (
    <AdminLayout title={config.title} subtitle={config.subtitle}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">{config.title}</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {config.status}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{config.summary}</p>
              </div>
            </div>

            {config.primaryAction || config.actions?.length ? (
              <div className="flex flex-wrap gap-2">
                {config.primaryAction ? (
                  <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
                    <Link to={config.primaryAction.href}>
                      {config.primaryAction.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}

                {config.actions?.map((action) => (
                  <Button key={action.href} asChild variant="outline" className="rounded-full">
                    <Link to={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {config.metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.note}</p>
            </div>
          ))}
        </section>

        {feature === 'broker-crm' ? <BrokerCrmLiveLeads /> : null}
        {feature === 'owner-crm' ? <OwnerCrmLiveLeads /> : null}

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-900">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="font-semibold">Implementation rule</h2>
              <p className="mt-1 text-sm leading-6">
                These modules are admin workspaces first. External APIs, live chat providers, map keys and AI keys
                can be connected module by module without breaking property CRUD or the URL-first society workflow.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <StatusList title="Current Workflows" items={config.workflows} done />
          <StatusList title="Connected Now" items={config.connected} done />
          <StatusList title="Pending Integrations" items={config.pending} />
          <StatusList title="Next Build Steps" items={config.nextBuild} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Recommended Next Action</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep shipping in small slices: connect the data model first, then API, then UI automation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/admin/verified-society-importer">
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Auto import societies
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/admin/leads">
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  Lead pipeline
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
