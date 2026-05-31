import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  LineChart,
  MapPinned,
  MessageSquareText,
  Search,
  Target,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

type FeatureExperienceKey = 'maps' | 'broker-crm' | 'chat' | 'recommendations';

type FeatureExperienceConfig = {
  title: string;
  eyebrow: string;
  subtitle: string;
  icon: typeof Bot;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction: {
    label: string;
    href: string;
  };
  steps: string[];
  panels: Array<{
    title: string;
    text: string;
    icon: typeof Bot;
  }>;
};

const featurePages: Record<FeatureExperienceKey, FeatureExperienceConfig> = {
  maps: {
    title: 'Maps Intelligence',
    eyebrow: 'Location first search',
    subtitle:
      'Explore societies by sector, micro-market and nearby daily-life anchors like metro, schools, hospitals and office hubs.',
    icon: MapPinned,
    primaryAction: { label: 'Search by locality', href: '/search?tab=societies' },
    secondaryAction: { label: 'View insights', href: '/insights' },
    steps: [
      'Search a sector, road or society name',
      'Open a society profile and check location context',
      'Use nearby intelligence before shortlisting',
      'Request a callback when you need verified map-pin help',
    ],
    panels: [
      {
        title: 'Society map context',
        text: 'Society profiles can show Google Maps links, coordinates and locality context once verified by admin.',
        icon: MapPinned,
      },
      {
        title: 'Nearby intelligence',
        text: 'Schools, metro, hospitals and office hubs are stored as structured profile fields, not loose marketing text.',
        icon: Search,
      },
      {
        title: 'Verification guardrail',
        text: 'Map pins are reviewed before publishing so users do not rely on unverified imported coordinates.',
        icon: CheckCircle2,
      },
    ],
  },
  'broker-crm': {
    title: 'Broker CRM',
    eyebrow: 'Lead pipeline',
    subtitle:
      'A CRM layer for SocietyFlats leads, callbacks, owner listings and broker follow-ups. Public users enter through inquiry and listing flows.',
    icon: BriefcaseBusiness,
    primaryAction: { label: 'List your property', href: '/sell' },
    secondaryAction: { label: 'Browse inventory', href: '/search?tab=rent' },
    steps: [
      'Owner or buyer submits an inquiry',
      'Admin reviews the lead in the CRM pipeline',
      'Broker or internal team follows up',
      'Lead is matched with society and property context',
    ],
    panels: [
      {
        title: 'Owner lead capture',
        text: 'The public sell flow is the entry point for owners who want to list inventory.',
        icon: BriefcaseBusiness,
      },
      {
        title: 'Buyer and tenant context',
        text: 'Search and society pages send users toward the right inquiry path with society context preserved.',
        icon: Target,
      },
      {
        title: 'Admin pipeline',
        text: 'The admin leads area is where status, follow-up and broker assignment can be managed next.',
        icon: LineChart,
      },
    ],
  },
  chat: {
    title: 'Chat and Callback',
    eyebrow: 'Fast contact',
    subtitle:
      'Chat is the conversation layer for people who want a quick answer, a callback, a visit slot or WhatsApp support.',
    icon: MessageSquareText,
    primaryAction: { label: 'Request help', href: '/search?tab=societies' },
    secondaryAction: { label: 'List property', href: '/sell' },
    steps: [
      'Visitor asks about a society or property',
      'Message becomes a lead with page context',
      'Admin replies or routes it to the right broker',
      'Conversation continues by callback or WhatsApp',
    ],
    panels: [
      {
        title: 'Inquiry-first flow',
        text: 'Until live chat provider integration is connected, CTAs route users into existing lead flows.',
        icon: MessageSquareText,
      },
      {
        title: 'Template replies',
        text: 'Admin-side chat will support approved response templates for rent, buy, sell and society questions.',
        icon: Bot,
      },
      {
        title: 'CRM handoff',
        text: 'Qualified conversations should move into Broker CRM instead of living as isolated messages.',
        icon: BriefcaseBusiness,
      },
    ],
  },
  recommendations: {
    title: 'Recommendation Engine',
    eyebrow: 'Find your best-fit society',
    subtitle:
      'Recommendations combine budget, location, lifestyle needs and verified society data so users can shortlist faster.',
    icon: Target,
    primaryAction: { label: 'Start AI Advisor', href: '/ai-advisor' },
    secondaryAction: { label: 'Use advanced search', href: '/search' },
    steps: [
      'Tell SocietyFlats your budget and lifestyle needs',
      'Match societies by location, amenities and fit',
      'Prefer live, verified public listings',
      'Send the best matches into callback or shortlist flow',
    ],
    panels: [
      {
        title: 'AI Advisor input',
        text: 'The AI Advisor is the public starting point for recommendation preferences.',
        icon: Bot,
      },
      {
        title: 'Search ranking',
        text: 'Advanced search gives the engine structured signals like locality, BHK, budget and intent.',
        icon: Search,
      },
      {
        title: 'Explainable matches',
        text: 'The next engine layer should show why a society was recommended before sending a lead.',
        icon: CheckCircle2,
      },
    ],
  },
};

type FeatureExperiencePageProps = {
  feature: FeatureExperienceKey;
};

export function FeatureExperiencePage({ feature }: FeatureExperiencePageProps) {
  const config = featurePages[feature];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-navy-100 bg-ivory-100 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-600 text-white shadow-sm shadow-navy-600/20">
              <Icon className="h-7 w-7" />
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-navy-600">{config.eyebrow}</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-navy-900 md:text-6xl">{config.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-navy-500">{config.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-full bg-navy-600 px-6 hover:bg-navy-700">
                <Link to={config.primaryAction.href}>
                  {config.primaryAction.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-navy-200 px-6 text-navy-700 hover:bg-white">
                <Link to={config.secondaryAction.href}>{config.secondaryAction.label}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-navy-100 bg-white p-6 shadow-soft">
              <h2 className="text-2xl font-bold text-navy-900">How it works</h2>
              <div className="mt-6 space-y-4">
                {config.steps.map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-navy-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {config.panels.map((panel) => {
                const PanelIcon = panel.icon;
                return (
                  <div key={panel.title} className="rounded-[2rem] border border-navy-100 bg-ivory-100 p-6">
                    <PanelIcon className="h-7 w-7 text-navy-600" />
                    <h3 className="mt-5 text-lg font-bold text-navy-900">{panel.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-navy-500">{panel.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
