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
  | 'broker-crm'
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
      label: 'Add society from URL',
      href: '/admin/societies/new-from-url',
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

function BrokerCrmLiveLeads() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);

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
  const visibleLeads = brokerLeads.slice(0, 6);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <div className="mt-5 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          <span>Lead</span>
          <span>Interest</span>
          <span>Partner stage</span>
          <span>Profile</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm font-medium text-slate-500">Loading broker leads...</div>
        ) : visibleLeads.length ? (
          <div className="divide-y divide-slate-100">
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="grid grid-cols-[1.1fr_1fr_0.9fr_0.8fr] gap-4 px-4 py-4 text-sm">
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
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to={`/admin/leads/${lead.id}`}>Open profile</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-sm font-medium text-slate-500">
            No broker partner leads yet. Public broker enquiries will appear here once submitted.
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
              <div className="flex flex-wrap gap-3">
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

        <section className="grid gap-4 md:grid-cols-3">
          {config.metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.note}</p>
            </div>
          ))}
        </section>

        {feature === 'broker-crm' ? <BrokerCrmLiveLeads /> : null}

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

        <section className="grid gap-4 lg:grid-cols-2">
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
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/admin/societies/new-from-url">
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Society URL flow
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
