// C81 admin leads lite polish: compact scan layout, tighter filters/cards, no bulk write actions.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Download,
  Eye,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminLead,
  LeadPriority,
  LeadStatus,
  addLeadNoteRemote,
  deleteAdminLeadRemote,
  exportLeadsCsv,
  fetchAdminLeads,
  listAdminLeads,
  saveAdminLead,
  updateLeadStatusRemote,
} from "@/lib/adminLeadStore";

const statuses: Array<"All" | LeadStatus> = [
  "All",
  "New",
  "Contacted",
  "Site Visit",
  "Negotiation",
  "Booked",
  "Lost",
];

const pipelineViews = [
  { label: "All", view: "all" },
  { label: "Society Leads", view: "society" },
  { label: "Property Leads", view: "property" },
  { label: "Owner Listings", view: "owner" },
  { label: "Broker Listings", view: "broker" },
  { label: "AI / General", view: "ai" },
  { label: "Test / QA", view: "test_qa" },
];

const priorities: Array<"All" | LeadPriority> = ["All", "Hot", "Warm", "Cold"];
const agents = ["Nitin", "Amit", "Rohit", "Priya", "Unassigned"];


function isBrokerLeadSource(source?: string) {
  const value = String(source || "").toLowerCase();

  return (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake") ||
    value.includes("public_broker_crm")
  );
}

function isOwnerLeadSource(source?: string) {
  const value = String(source || "").toLowerCase();

  return (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  );
}



function cleanLeadInterestMeta(lead: AdminLead) {
  if (isBrokerLeadSource(lead.source)) {
    return lead.property || "Broker partner enquiry";
  }

  if (isOwnerLeadSource(lead.source)) {
    return lead.property || "Owner listing enquiry";
  }

  return lead.property || "General enquiry";
}

function cleanLeadInterestRequirement(lead: AdminLead) {
  if (isBrokerLeadSource(lead.source)) {
    return "Broker partner onboarding";
  }

  if (isOwnerLeadSource(lead.source)) {
    return lead.requirement || "Owner inventory submission";
  }

  return lead.requirement || "Not specified";
}

function cleanLeadInterest(lead: AdminLead) {
  if (isBrokerLeadSource(lead.source)) {
    return {
      title: lead.society || lead.property || "Broker partner enquiry",
      subtitle: "Broker partner onboarding",
    };
  }

  if (isOwnerLeadSource(lead.source)) {
    return {
      title: lead.society || lead.property || "Owner listing enquiry",
      subtitle: lead.requirement || "Owner inventory submission",
    };
  }

  return {
    title: lead.society || lead.property || "General enquiry",
    subtitle: lead.requirement || lead.property || "Not specified",
  };
}


function cleanLeadInterestTitle(lead: AdminLead) {
  if (isBrokerLeadSource(lead.source)) {
    return lead.society || lead.property || "Broker partner enquiry";
  }

  if (isOwnerLeadSource(lead.source)) {
    return lead.society || lead.property || "Owner listing enquiry";
  }

  return lead.society || lead.property || "General enquiry";
}

function cleanLeadInterestSubtitle(lead: AdminLead) {
  if (isBrokerLeadSource(lead.source)) {
    return "Broker partner onboarding";
  }

  if (isOwnerLeadSource(lead.source)) {
    return lead.requirement || "Owner inventory submission";
  }

  return lead.requirement || lead.property || "Not specified";
}


function displayLeadStatusOptionLabel(lead: AdminLead, status: LeadStatus) {
  if (isBrokerLeadSource(lead.source)) {
    if (status === "Booked") return "Active Partner";
    if (status === "Lost") return "Not Suitable";
  }

  if (isOwnerLeadSource(lead.source)) {
    if (status === "Booked") return "Owner Active";
    if (status === "Lost") return "Inactive Owner";
  }

  return status;
}

function displayLeadStatusLabel(lead: AdminLead) {
  if (isBrokerLeadSource(lead.source)) {
    if (lead.status === "Booked") return "Active Partner";
    if (lead.status === "Lost") return "Not Suitable";
  }

  if (isOwnerLeadSource(lead.source)) {
    if (lead.status === "Booked") return "Owner Active";
    if (lead.status === "Lost") return "Inactive Owner";
  }

  return lead.status;
}

function statusClass(status: LeadStatus) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700";
    case "Contacted":
      return "bg-sky-50 text-sky-700";
    case "Site Visit":
      return "bg-violet-50 text-violet-700";
    case "Negotiation":
      return "bg-amber-50 text-amber-700";
    case "Booked":
      return "bg-emerald-50 text-emerald-700";
    case "Lost":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function priorityClass(priority: LeadPriority) {
  switch (priority) {
    case "Hot":
      return "bg-rose-50 text-rose-700";
    case "Warm":
      return "bg-amber-50 text-amber-700";
    case "Cold":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function sourceLabel(source?: string) {
  const value = String(source || "").toLowerCase();

  if (
    value.includes("map_search") ||
    value.includes("map-search") ||
    value.includes("map search")
  ) {
    return "Map/Search conversion";
  }


  if (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  ) {
    return "Owner listing";
  }

  if (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake")
  ) {
    return "Broker partner";
  }

  if (value.includes("ai")) return "AI advisor";

  if (value.includes("ai_advisor_callback") || value.includes("ai_advisor_page")) return "AI advisor";
  if (value.includes("homepage_hero_live_map")) return "Homepage map";
  if (value.includes("homepage_live_inventory_callback")) return "Homepage inventory";
  if (value.includes("homepage_empty_inventory")) return "Homepage no-inventory";
  if (value.includes("homepage_owner_talk")) return "Homepage owner CTA";
  if (value.includes("homepage_ai")) return "Homepage AI";
  if (value.includes("floating_chat_callback")) return "Floating chat";
  if (value.includes("map_search_conversion")) return "Map search";
  if (value.includes("owner_listing_rent")) return "Owner rent listing";
  if (value.includes("owner_listing_sale")) return "Owner sale listing";
  if (value.includes("sell_page_owner_listing")) return "Owner listing form";
  if (value === "sell_page" || value.includes("sell_page")) return "Sell page";
  if (value === "search_page" || value.includes("search_page")) return "Search page";
  if (value.includes("property_page_callback") || value.includes("property_callback")) {
    return "Property callback";
  }

  if (value.includes("property_page_enquiry") || value.includes("property_enquiry")) {
    return "Property enquiry";
  }

  if (value.includes("search_no_results")) return "Search no-result";
  if (value.includes("search_property_card")) return "Search property";
  if (value.includes("search_society_card")) return "Search society";
  if (value.includes("society_page_property")) return "Society property";
  if (value.includes("society_page")) return "Society page";
  if (value.includes("floating")) return "Floating chat";
  if (value.includes("homepage")) return "Homepage";
  if (value.includes("callback")) return "General callback";
  if (value.includes("search")) return "Search enquiry";
  if (value.includes("society")) return "Society enquiry";
  if (value.includes("property")) return "Property enquiry";

  return source || "Website";
}


function attributionBadge(lead: AdminLead) {
  const campaign = String(lead.utm_campaign || "").trim();
  const medium = String(lead.utm_medium || "").trim();
  const sourcePage = String(lead.source_page || "").trim();
  const aiQuery = String(lead.ai_query || "").trim();
  const searchQuery = String(lead.search_query || "").trim();

  if (campaign || medium) return "UTM";
  if (aiQuery || String(lead.source || "").toLowerCase().includes("ai")) return "AI";
  if (
    searchQuery ||
    sourcePage.includes("/search") ||
    String(lead.source || "").toLowerCase().includes("map_search")
  ) return "Search";
  if (sourcePage.includes("/sell") || String(lead.source || "").toLowerCase().includes("owner")) return "Owner";
  if (sourcePage.includes("/property") || String(lead.source || "").toLowerCase().includes("property")) return "Property";
  if (sourcePage.includes("/society") || String(lead.source || "").toLowerCase().includes("society")) return "Society";
  return "";
}

function sourceBucket(lead: AdminLead) {
  const source = String(lead.source || "").toLowerCase();
  const page = String(lead.source_page || "").toLowerCase();
  const aiQuery = String(lead.ai_query || "").trim();
  const searchQuery = String(lead.search_query || "").trim();

  if (aiQuery || source.includes("ai")) return "ai";
  if (
    searchQuery ||
    page.includes("/search") ||
    source.includes("map_search") ||
    source.includes("map-search") ||
    source.includes("map search") ||
    source.includes("search")
  ) return "search";
  if (isOwnerLeadSource(source) || page.includes("/sell")) return "owner";
  if (isBrokerLeadSource(source)) return "broker";
  if (page.includes("/property") || source.includes("property")) return "property";
  if (page.includes("/society") || source.includes("society")) return "society";

  return "website";
}

function attributionSearchText(lead: AdminLead) {
  return [
    lead.source,
    lead.source_page,
    lead.page_url,
    lead.referrer,
    lead.cta_label,
    lead.utm_source,
    lead.utm_medium,
    lead.utm_campaign,
    lead.utm_term,
    lead.utm_content,
    lead.lead_intent,
    lead.search_query,
    lead.ai_query,
    lead.entity_type,
    lead.entity_slug,
    sourceLabel(lead.source),
    attributionBadge(lead),
    sourceBucket(lead),
    leadIntentSearchText(lead),
  ]
    .filter(Boolean)
    .join(" ");
}

function attributionTitle(lead: AdminLead) {
  return [
    `Source: ${lead.source || "Website"}`,
    lead.source_page ? `Page: ${lead.source_page}` : "",
    lead.cta_label ? `CTA: ${lead.cta_label}` : "",
    lead.lead_intent ? `Intent: ${lead.lead_intent}` : "",
    lead.search_query ? `Search: ${lead.search_query}` : "",
    lead.ai_query ? `AI: ${lead.ai_query}` : "",
    lead.utm_campaign ? `Campaign: ${lead.utm_campaign}` : "",
  ].filter(Boolean).join(" · ");
}


function workflowNextAction(lead: AdminLead) {
  const status = lead.status;
  const source = String(lead.source || "").toLowerCase();
  const followUp = followUpState(lead);

  if (status === "Booked") {
    if (isOwnerLeadSource(source)) return "Keep owner inventory active";
    if (isBrokerLeadSource(source)) return "Keep partner active";
    return "Closed lead - monitor";
  }

  if (status === "Lost") return "No action - inactive";
  if (followUp === "overdue") return "Call now - overdue";
  if (followUp === "today") return "Follow up today";

  if (isOwnerLeadSource(source)) {
    if (status === "New") return "Verify ownership";
    if (status === "Contacted") return "Ask photos + details";
    if (status === "Negotiation") return "Confirm price and create draft";
    return "Move owner lead forward";
  }

  if (isBrokerLeadSource(source)) {
    if (status === "New") return "Verify broker profile";
    if (status === "Contacted") return "Ask inventory areas";
    if (status === "Negotiation") return "Finalize partner terms";
    return "Move broker lead forward";
  }

  if (source.includes("property")) {
    if (status === "New") return "Call and check requirement";
    if (status === "Contacted") return "Share matching homes";
    if (status === "Site Visit") return "Confirm visit timing";
    return "Move property lead forward";
  }

  if (
    source.includes("society") ||
    source.includes("map_search") ||
    source.includes("map-search") ||
    source.includes("map search") ||
    source.includes("search") ||
    source.includes("ai")
  ) {
    if (status === "New") return "Call and qualify requirement";
    if (status === "Contacted") return "Send shortlist";
    if (status === "Site Visit") return "Schedule society visit";
    return "Move enquiry forward";
  }

  return status === "New" ? "Contact lead" : "Review next step";
}

function workflowNextActionClass(lead: AdminLead) {
  const next = workflowNextAction(lead).toLowerCase();

  if (next.includes("overdue") || next.includes("call now")) return "bg-rose-50 text-rose-700 border-rose-100";
  if (next.includes("today")) return "bg-amber-50 text-amber-700 border-amber-100";
  if (next.includes("active") || next.includes("closed")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (next.includes("inactive")) return "bg-slate-50 text-slate-500 border-slate-100";

  return "bg-blue-50 text-blue-700 border-blue-100";
}


function compactLeadTypeLabel(lead: AdminLead) {
  const bucket = sourceBucket(lead);

  if (bucket === "owner") return "Owner";
  if (bucket === "broker") return "Broker";
  if (bucket === "property") return "Property";
  if (bucket === "society") return "Society";
  if (bucket === "ai") return "AI";
  if (bucket === "search") return "Search";

  return sourceLabel(lead.source);
}


function sourceClass(source?: string) {
  const value = String(source || "").toLowerCase();

  if (
    value.includes("owner") ||
    value.includes("sell") ||
    value.includes("seller") ||
    value.includes("listing_submission") ||
    value.includes("list_property")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (
    value.includes("broker") ||
    value.includes("partner") ||
    value.includes("agent") ||
    value.includes("crm_intake")
  ) {
    return "bg-orange-50 text-orange-700 border-orange-100";
  }

  if (value.includes("ai")) return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (
    value.includes("map_search") ||
    value.includes("map-search") ||
    value.includes("map search") ||
    value.includes("search")
  ) return "bg-sky-50 text-sky-700 border-sky-100";
  if (value.includes("property")) return "bg-violet-50 text-violet-700 border-violet-100";
  if (value.includes("society")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (value.includes("floating") || value.includes("chat") || value.includes("callback")) {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }

  return "bg-slate-50 text-slate-600 border-slate-100";
}

function c14RequirementLabel(lead: AdminLead) {
  const source = String(lead.source || "").toLowerCase();
  const requirement = String(lead.requirement || "").trim();

  if (source.includes("owner")) {
    if (requirement.toLowerCase().includes("rent")) return "Owner Listing · Rent";
    if (
      requirement.toLowerCase().includes("sale") ||
      requirement.toLowerCase().includes("sell") ||
      requirement.toLowerCase().includes("buy")
    ) {
      return "Owner Listing · Sale";
    }
    return requirement || "Owner Listing";
  }

  if (source.includes("broker")) {
    return requirement || "Broker Partner Lead";
  }

  if (source.includes("property")) {
    if (requirement.toLowerCase().includes("rent")) return "Property · Rent";
    if (
      requirement.toLowerCase().includes("buy") ||
      requirement.toLowerCase().includes("sale") ||
      requirement.toLowerCase().includes("resale")
    ) {
      return "Property · Buy";
    }
    return requirement || "Property Enquiry";
  }

  if (source.includes("society")) {
    return requirement || "Society Callback";
  }

  if (source.includes("chat")) {
    return requirement || "Chat Enquiry";
  }

  return requirement || "General Enquiry";
}


type AdminLeadIntentSignal = {
  label: string;
  helper: string;
  className: string;
};

function leadIntentSignal(lead: AdminLead): AdminLeadIntentSignal {
  const source = String(lead.source || "").toLowerCase();
  const page = String(lead.source_page || "").toLowerCase();
  const cta = String(lead.cta_label || "").toLowerCase();
  const intent = String(lead.lead_intent || "").toLowerCase();
  const requirement = String(lead.requirement || "").toLowerCase();
  const entityType = String(lead.entity_type || "").toLowerCase();
  const aiQuery = String(lead.ai_query || "").trim();
  const searchQuery = String(lead.search_query || "").trim();
  const combined = [source, page, cta, intent, requirement, entityType].join(" ");

  const helper = [
    lead.cta_label ? `CTA: ${lead.cta_label}` : "",
    lead.entity_type ? `Entity: ${lead.entity_type}${lead.entity_slug ? ` · ${lead.entity_slug}` : ""}` : "",
    lead.search_query ? `Search: ${lead.search_query}` : "",
    lead.ai_query ? `AI: ${lead.ai_query}` : "",
  ].filter(Boolean).join(" · ") || sourceLabel(lead.source);

  if (isOwnerLeadSource(source) || page.includes("/sell") || entityType.includes("owner")) {
    if (/rent|rental/.test(combined)) {
      return {
        label: "Owner Listing · Rent",
        helper,
        className: "border-emerald-100 bg-emerald-50 text-emerald-700",
      };
    }

    if (/sale|sell|resale|buy/.test(combined)) {
      return {
        label: "Owner Listing · Sale",
        helper,
        className: "border-emerald-100 bg-emerald-50 text-emerald-700",
      };
    }

    return {
      label: "Owner Listing",
      helper,
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    };
  }

  if (isBrokerLeadSource(source) || entityType.includes("broker")) {
    return {
      label: "Broker Partner",
      helper,
      className: "border-orange-100 bg-orange-50 text-orange-700",
    };
  }

  if (combined.includes("visit") || lead.status === "Site Visit") {
    return {
      label: "Visit Request",
      helper,
      className: "border-rose-100 bg-rose-50 text-rose-700",
    };
  }

  if (sourceBucket(lead) === "property" || entityType.includes("property")) {
    if (/rent|rental/.test(combined)) {
      return {
        label: "Property · Rent",
        helper,
        className: "border-violet-100 bg-violet-50 text-violet-700",
      };
    }

    if (/buy|sale|resale|purchase/.test(combined)) {
      return {
        label: "Property · Buy",
        helper,
        className: "border-violet-100 bg-violet-50 text-violet-700",
      };
    }

    if (combined.includes("callback")) {
      return {
        label: "Property Callback",
        helper,
        className: "border-violet-100 bg-violet-50 text-violet-700",
      };
    }

    return {
      label: "Property Enquiry",
      helper,
      className: "border-violet-100 bg-violet-50 text-violet-700",
    };
  }

  if (sourceBucket(lead) === "society" || entityType.includes("society")) {
    return {
      label: combined.includes("callback") ? "Society Callback" : "Society Enquiry",
      helper,
      className: "border-blue-100 bg-blue-50 text-blue-700",
    };
  }

  if (aiQuery || sourceBucket(lead) === "ai" || combined.includes("ai")) {
    return {
      label: "AI Enquiry",
      helper,
      className: "border-indigo-100 bg-indigo-50 text-indigo-700",
    };
  }

  if (searchQuery || sourceBucket(lead) === "search" || combined.includes("search")) {
    return {
      label: "Search Enquiry",
      helper,
      className: "border-sky-100 bg-sky-50 text-sky-700",
    };
  }

  if (combined.includes("callback") || combined.includes("chat")) {
    return {
      label: "General Callback",
      helper,
      className: "border-amber-100 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: lead.requirement || "General Enquiry",
    helper,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  };
}

function leadIntentSearchText(lead: AdminLead) {
  const signal = leadIntentSignal(lead);

  return [
    signal.label,
    signal.helper,
    signal.label.toLowerCase().replace(/[^a-z0-9]+/g, " "),
    "c112g lead intent business intent rent buy visit owner broker ai search society property callback",
  ].filter(Boolean).join(" ");
}



function cleanPhone(phone?: string) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function canUsePhone(phone?: string) {
  return cleanPhone(phone).length >= 10;
}

function leadPhoneKey(lead: AdminLead) {
  return cleanPhone(lead.phone).slice(-10);
}

function samePhoneLeadCount(lead: AdminLead, allLeads: AdminLead[]) {
  const key = leadPhoneKey(lead);
  if (!key || key.length < 10) return 0;

  return allLeads.filter((item) => leadPhoneKey(item) === key).length;
}

function hasMeaningfulRequirement(lead: AdminLead) {
  const value = String(lead.requirement || "").trim().toLowerCase();

  return Boolean(value) && !["not specified", "general enquiry", "general inquiry", "requirement pending"].includes(value);
}

function isMissingPhoneLead(lead: AdminLead) {
  return !canUsePhone(lead.phone);
}

function isMissingRequirementLead(lead: AdminLead) {
  return !hasMeaningfulRequirement(lead);
}

function isDuplicateLead(lead: AdminLead, allLeads: AdminLead[]) {
  return samePhoneLeadCount(lead, allLeads) > 1;
}

function isHighIntentLead(lead: AdminLead) {
  const source = String(lead.source || "").toLowerCase();
  const cta = String(lead.cta_label || "").toLowerCase();
  const intent = String(lead.lead_intent || "").toLowerCase();
  const requirement = String(lead.requirement || "").toLowerCase();
  const combined = [source, cta, intent, requirement].join(" ");

  return (
    lead.priority === "Hot" ||
    combined.includes("callback") ||
    combined.includes("visit") ||
    combined.includes("buy") ||
    combined.includes("rent") ||
    combined.includes("owner") ||
    combined.includes("broker") ||
    sourceBucket(lead) === "property"
  );
}

function isCompleteLead(lead: AdminLead) {
  return canUsePhone(lead.phone) && hasMeaningfulRequirement(lead) && Boolean(String(lead.name || "").trim());
}


function qaTestLeadText(lead: AdminLead) {
  return [
    lead.id ? `id:${lead.id}` : "",
    lead.name,
    lead.phone,
    lead.source,
    (lead as any).message,
    lead.requirement,
    lead.lead_intent,
    lead.search_query,
    lead.ai_query,
    lead.cta_label,
    lead.utm_campaign,
    lead.entity_type,
    lead.entity_slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isQaTestLead(lead: AdminLead) {
  const value = qaTestLeadText(lead);

  return (
    /\bc11[0-9][a-z0-9_-]*/i.test(value) ||
    value.includes("qa_validation") ||
    value.includes("qa validation") ||
    value.includes("invalid phone test") ||
    value.includes("valid phone test") ||
    value.includes("invalid probe") ||
    value.includes("valid final") ||
    value.includes("invalid final") ||
    value.includes("fix2 invalid") ||
    value.includes("fix2 valid") ||
    value.includes("test lead") ||
    value.includes("test_source") ||
    value.includes("_test") ||
    value.includes(" test ")
  );
}

function qaTestLeadSearchText(lead: AdminLead) {
  return isQaTestLead(lead)
    ? "test qa qa_validation c112 c112f validation probe invalid valid final test lead cleanup"
    : "";
}


function leadQualityBadges(lead: AdminLead, allLeads: AdminLead[]) {
  const badges: string[] = [];

  if (isQaTestLead(lead)) badges.push("Test / QA");
  if (isDuplicateLead(lead, allLeads)) badges.push(`Duplicate x${samePhoneLeadCount(lead, allLeads)}`);
  if (isMissingPhoneLead(lead)) badges.push("Missing phone");
  if (isMissingRequirementLead(lead)) badges.push("Missing requirement");
  if (isHighIntentLead(lead)) badges.push("High intent");
  if (isCompleteLead(lead) && !isDuplicateLead(lead, allLeads)) badges.push("Complete");

  return badges;
}

function leadQualityBadgeClass(label: string) {
  const value = label.toLowerCase();

  if (value.includes("test") || value.includes("qa")) return "border-slate-300 bg-slate-100 text-slate-700";
  if (value.includes("duplicate")) return "border-amber-100 bg-amber-50 text-amber-700";
  if (value.includes("missing")) return "border-rose-100 bg-rose-50 text-rose-700";
  if (value.includes("high")) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (value.includes("complete")) return "border-blue-100 bg-blue-50 text-blue-700";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function leadQualitySearchText(lead: AdminLead, allLeads: AdminLead[]) {
  return [
    ...leadQualityBadges(lead, allLeads),
    isDuplicateLead(lead, allLeads) ? "duplicate duplicate phone same phone repeated lead" : "",
    isMissingPhoneLead(lead) ? "missing phone no phone incomplete" : "",
    isMissingRequirementLead(lead) ? "missing requirement no requirement incomplete" : "",
    isHighIntentLead(lead) ? "high intent hot callback visit property owner broker" : "",
    isCompleteLead(lead) ? "complete quality complete" : "",
    qaTestLeadSearchText(lead),
  ].filter(Boolean).join(" ");
}

function whatsappUrl(lead: AdminLead) {
  const digits = cleanPhone(lead.phone).slice(-10);
  const interest = lead.property || lead.society || "your property requirement";
  const requirement = lead.requirement || "Not specified";
  const message = encodeURIComponent(
    [
      `Hi ${lead.name || ""}, this is SocietyFlats.`,
      `We received your enquiry for ${interest}.`,
      `Requirement: ${requirement}.`,
      "We can help with availability, pricing and visit timing.",
      "Please let us know a good time to connect.",
    ].join("\n")
  );

  return `https://wa.me/91${digits}?text=${message}`;
}

function isToday(value: string) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
}

function displayRequirement(lead: AdminLead) {
  return lead.requirement || lead.budget || "Not specified";
}

function displayFollowUp(lead: AdminLead) {
  if (!lead.followUpAt) return "Not set";

  const date = new Date(lead.followUpAt);
  if (Number.isNaN(date.getTime())) return lead.followUpAt;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function followUpState(lead: AdminLead) {
  if (!lead.followUpAt) return "not_set";

  const date = new Date(lead.followUpAt);
  if (Number.isNaN(date.getTime())) return "not_set";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (date.getTime() < now.getTime() && !sameDay) return "overdue";
  if (sameDay) return "today";

  return "upcoming";
}

function followUpLabel(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return "Overdue";
  if (state === "today") return "Today";
  if (state === "upcoming") return "Upcoming";

  return "Not set";
}

function followUpUrgencyLabel(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return "Needs action";
  if (state === "today") return "Due today";
  if (state === "upcoming") return "Scheduled";
  return "No reminder";
}

function followUpSortWeight(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return 0;
  if (state === "today") return 1;
  if (lead.priority === "Hot") return 2;
  if (state === "upcoming") return 3;
  if (lead.status === "New") return 4;

  return 5;
}

function followUpTimeValue(lead: AdminLead) {
  const date = new Date(lead.followUpAt || "");
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function followUpHelperText(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return `Overdue since ${displayFollowUp(lead)}`;
  if (state === "today") return `Due ${displayFollowUp(lead)}`;
  if (state === "upcoming") return `Scheduled ${displayFollowUp(lead)}`;

  return "Set a follow-up from lead detail";
}

function leadAgeDays(lead: AdminLead) {
  const date = new Date(lead.createdAt || "");
  if (Number.isNaN(date.getTime())) return 0;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return Math.max(0, Math.floor((today - start) / 86400000));
}

function isOpenSlaLead(lead: AdminLead) {
  return !["Booked", "Lost"].includes(lead.status);
}

function isFreshLead(lead: AdminLead) {
  return isOpenSlaLead(lead) && leadAgeDays(lead) === 0;
}

function isAgingLead(lead: AdminLead) {
  const age = leadAgeDays(lead);
  return isOpenSlaLead(lead) && age >= 1 && age <= 2;
}

function isStaleLead(lead: AdminLead) {
  return isOpenSlaLead(lead) && leadAgeDays(lead) >= 3;
}

function isHotSlaLead(lead: AdminLead) {
  return isOpenSlaLead(lead) && lead.priority === "Hot" && lead.status === "New";
}

function isUntouchedLead(lead: AdminLead) {
  return isOpenSlaLead(lead) && lead.status === "New" && followUpState(lead) === "not_set";
}

function isCallSheetLead(lead: AdminLead) {
  return (
    isOpenSlaLead(lead) &&
    (
      followUpState(lead) === "overdue" ||
      isHotSlaLead(lead) ||
      followUpState(lead) === "today" ||
      isUntouchedLead(lead) ||
      isStaleLead(lead)
    )
  );
}

function callSheetSortWeight(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return 0;
  if (isHotSlaLead(lead)) return 1;
  if (followUpState(lead) === "today") return 2;
  if (isUntouchedLead(lead)) return 3;
  if (isStaleLead(lead)) return 4;
  if (lead.priority === "Hot") return 5;
  if (followUpState(lead) === "not_set") return 6;

  return 9;
}

function callSheetReason(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "Overdue";
  if (isHotSlaLead(lead)) return "Hot SLA";
  if (followUpState(lead) === "today") return "Due today";
  if (isUntouchedLead(lead)) return "Untouched";
  if (isStaleLead(lead)) return "Stale";

  return "Follow-up";
}

function callSheetReasonClass(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "border-rose-100 bg-rose-50 text-rose-700";
  if (isHotSlaLead(lead)) return "border-orange-100 bg-orange-50 text-orange-700";
  if (followUpState(lead) === "today") return "border-blue-100 bg-blue-50 text-blue-700";
  if (isUntouchedLead(lead)) return "border-slate-200 bg-slate-50 text-slate-700";
  if (isStaleLead(lead)) return "border-amber-100 bg-amber-50 text-amber-700";

  return "border-slate-200 bg-white text-slate-600";
}

function leadAgeLabel(lead: AdminLead) {
  const age = leadAgeDays(lead);

  if (age === 0) return "New today";
  if (age <= 2) return `${age} day${age === 1 ? "" : "s"} old`;
  if (age < 7) return `${age} days old`;

  return "Stale 7d+";
}

function leadAgeBadgeClass(lead: AdminLead) {
  if (!isOpenSlaLead(lead)) return "border-slate-200 bg-slate-50 text-slate-500";
  if (isFreshLead(lead)) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (isAgingLead(lead)) return "border-amber-100 bg-amber-50 text-amber-700";
  if (isStaleLead(lead)) return "border-rose-100 bg-rose-50 text-rose-700";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function leadSlaBadges(lead: AdminLead) {
  const badges: string[] = [leadAgeLabel(lead)];

  if (isHotSlaLead(lead)) badges.push("Hot not contacted");
  if (followUpState(lead) === "not_set" && isOpenSlaLead(lead)) badges.push("No follow-up");
  if (isStaleLead(lead)) badges.push("Needs reactivation");
  if (followUpState(lead) === "overdue") badges.push("SLA overdue");

  return badges;
}

function leadSlaSearchText(lead: AdminLead) {
  return [
    ...leadSlaBadges(lead),
    isFreshLead(lead) ? "fresh new today lead age sla" : "",
    isAgingLead(lead) ? "aging 1 day 2 days old lead age sla" : "",
    isStaleLead(lead) ? "stale 3 days old reactivation aged lead age sla" : "",
    isHotSlaLead(lead) ? "hot sla hot not contacted priority new" : "",
    isUntouchedLead(lead) ? "untouched new no follow up no activity" : "",
  ].filter(Boolean).join(" ");
}

function dashboardLeadViewMatches(lead: AdminLead, view: string, allLeads: AdminLead[] = []) {
  if (!view || view === "all") return true;

  if (view === "test_qa") {
    return isQaTestLead(lead);
  }

  if (view === "today") {
    if (!lead.createdAt) return false;
    const date = new Date(lead.createdAt);
    return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
  }

  if (view === "active") {
    return !["Booked", "Lost"].includes(lead.status);
  }

  if (view === "call_sheet") {
    return isCallSheetLead(lead);
  }

  if (view === "followups") {
    return followUpState(lead) === "today";
  }

  if (view === "overdue") {
    return followUpState(lead) === "overdue";
  }

  if (view === "upcoming") {
    return followUpState(lead) === "upcoming";
  }

  if (view === "no_followup") {
    return followUpState(lead) === "not_set";
  }

  if (view === "duplicates") {
    return isDuplicateLead(lead, allLeads);
  }

  if (view === "missing_phone") {
    return isMissingPhoneLead(lead);
  }

  if (view === "missing_requirement") {
    return isMissingRequirementLead(lead);
  }

  if (view === "high_intent") {
    return isHighIntentLead(lead);
  }

  if (view === "fresh") {
    return isFreshLead(lead);
  }

  if (view === "aging") {
    return isAgingLead(lead);
  }

  if (view === "stale") {
    return isStaleLead(lead);
  }

  if (view === "hot_sla") {
    return isHotSlaLead(lead);
  }

  if (view === "untouched") {
    return isUntouchedLead(lead);
  }

  if (view === "ai") {
    return sourceBucket(lead) === "ai";
  }

  if (view === "search") {
    return sourceBucket(lead) === "search";
  }

  if (view === "property") {
    return sourceBucket(lead) === "property";
  }

  if (view === "society") {
    return sourceBucket(lead) === "society";
  }

  if (view === "hot") {
    return lead.priority === "Hot";
  }

  if (view === "booked") {
    return lead.status === "Booked";
  }

  if (view === "owner") {
    const value = String(lead.source || "").toLowerCase();
    return (
      value.includes("owner") ||
      value.includes("sell") ||
      value.includes("seller") ||
      value.includes("listing_submission") ||
      value.includes("list_property")
    );
  }

  if (view === "broker") {
    const value = String(lead.source || "").toLowerCase();
    return (
      value.includes("broker") ||
      value.includes("partner") ||
      value.includes("agent") ||
      value.includes("crm_intake")
    );
  }

  return true;
}

function dashboardLeadViewLabel(view: string) {
  if (view === "today") return "Today’s leads";
  if (view === "active") return "Active leads";
  if (view === "call_sheet") return "Today’s call sheet";
  if (view === "followups") return "Follow-ups due today";
  if (view === "overdue") return "Overdue follow-ups";
  if (view === "upcoming") return "Upcoming follow-ups";
  if (view === "no_followup") return "Leads without follow-up";
  if (view === "duplicates") return "Duplicate phone leads";
  if (view === "missing_phone") return "Leads missing phone";
  if (view === "missing_requirement") return "Leads missing requirement";
  if (view === "high_intent") return "High-intent leads";
  if (view === "fresh") return "Fresh leads";
  if (view === "aging") return "Aging leads";
  if (view === "stale") return "Stale leads";
  if (view === "hot_sla") return "Hot SLA leads";
  if (view === "untouched") return "Untouched leads";
  if (view === "ai") return "AI / General leads";
  if (view === "test_qa") return "Test / QA leads";
  if (view === "search") return "Search journey leads";
  if (view === "property") return "Property page leads";
  if (view === "society") return "Society page leads";
  if (view === "hot") return "Hot leads";
  if (view === "booked") return "Booked leads";
  if (view === "owner") return "Owner listing leads";
  if (view === "broker") return "Broker partner leads";
  return "";
}

function pipelineViewCount(leads: AdminLead[], view: string) {
  if (view === "all") return leads.length;
  return leads.filter((lead) => dashboardLeadViewMatches(lead, view, leads)).length;
}

function pipelineEmptyMessage(view: string) {
  if (view === "today") return "No new leads today.";
  if (view === "active") return "No active leads in the pipeline.";
  if (view === "call_sheet") return "No leads in today’s call sheet.";
  if (view === "followups") return "No follow-ups due today.";
  if (view === "overdue") return "No overdue follow-ups. You’re clear for now.";
  if (view === "upcoming") return "No upcoming follow-ups scheduled.";
  if (view === "no_followup") return "Every visible lead already has a follow-up set.";
  if (view === "duplicates") return "No duplicate phone leads found.";
  if (view === "missing_phone") return "No leads missing phone.";
  if (view === "missing_requirement") return "No leads missing requirement.";
  if (view === "high_intent") return "No high-intent leads found.";
  if (view === "fresh") return "No fresh leads right now.";
  if (view === "aging") return "No 1–2 day aging leads right now.";
  if (view === "stale") return "No stale leads found.";
  if (view === "hot_sla") return "No hot SLA leads pending.";
  if (view === "untouched") return "No untouched leads found.";
  if (view === "ai") return "No AI or general leads found.";
  if (view === "test_qa") return "No test or QA leads found.";
  if (view === "search") return "No search journey leads found.";
  if (view === "property") return "No property page leads found.";
  if (view === "society") return "No society page leads found.";
  if (view === "hot") return "No hot leads right now.";
  if (view === "booked") return "No booked leads yet.";
  if (view === "owner") return "No owner listing leads yet.";
  if (view === "broker") return "No broker partner leads yet.";
  return "No leads found for the selected filters.";
}

function followUpClass(lead: AdminLead) {
  const state = followUpState(lead);

  if (state === "overdue") return "bg-rose-50 text-rose-700 border-rose-100";
  if (state === "today") return "bg-blue-50 text-blue-700 border-blue-100";
  if (state === "upcoming") return "bg-emerald-50 text-emerald-700 border-emerald-100";

  return "bg-slate-50 text-slate-500 border-slate-100";
}

function formatLeadDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tomorrowFollowUpValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 30, 0, 0);

  return formatLeadDateTime(date);
}

function leadTypeWorkflowLabel(lead: AdminLead) {
  if (isOwnerLeadSource(lead.source)) return "Owner";
  if (isBrokerLeadSource(lead.source)) return "Broker";

  const value = String(lead.source || "").toLowerCase();
  if (value.includes("property")) return "Property";
  if (value.includes("society")) return "Society";
  if (value.includes("search") || value.includes("ai")) return "Search";

  return "Website";
}

function leadRowAccentClass(lead: AdminLead) {
  if (isOwnerLeadSource(lead.source)) return "border-l-4 border-l-emerald-400";
  if (isBrokerLeadSource(lead.source)) return "border-l-4 border-l-orange-400";

  const value = String(lead.source || "").toLowerCase();
  if (value.includes("property")) return "border-l-4 border-l-violet-400";
  if (value.includes("society")) return "border-l-4 border-l-blue-400";
  if (value.includes("search") || value.includes("ai")) return "border-l-4 border-l-sky-400";
  if (followUpState(lead) === "overdue") return "border-l-4 border-l-rose-400";
  if (followUpState(lead) === "not_set") return "border-l-4 border-l-slate-300";

  return "border-l-4 border-l-transparent";
}

function workflowStripClass(lead: AdminLead) {
  if (followUpState(lead) === "overdue") return "border-rose-100 bg-rose-50";
  if (followUpState(lead) === "not_set") return "border-slate-200 bg-slate-50";
  if (lead.priority === "Hot") return "border-amber-100 bg-amber-50";
  if (isOwnerLeadSource(lead.source)) return "border-emerald-100 bg-emerald-50";
  if (isBrokerLeadSource(lead.source)) return "border-orange-100 bg-orange-50";

  return "border-blue-100 bg-blue-50";
}

function workflowButtonClass(tone: "blue" | "rose" | "amber" | "slate" | "emerald") {
  if (tone === "rose") return "border-rose-100 bg-white text-rose-700 hover:bg-rose-50";
  if (tone === "amber") return "border-amber-100 bg-white text-amber-700 hover:bg-amber-50";
  if (tone === "emerald") return "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50";
  if (tone === "slate") return "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return "border-blue-100 bg-white text-blue-700 hover:bg-blue-50";
}

function c57QuickActionNote(
  updates: Partial<Pick<AdminLead, "status" | "priority" | "followUpAt">>,
  actionLabel: string,
) {
  if (actionLabel.toLowerCase().includes("duplicate")) {
    return "Admin note: Duplicate lead reviewed from duplicate resolution workflow";
  }

  if (updates.followUpAt) {
    return `Follow-up reminder set from lead list: ${updates.followUpAt}`;
  }

  if (updates.status === "Contacted") {
    return "Contact action: Lead marked Contacted from lead list quick action";
  }

  if (updates.status === "Lost") {
    return "Admin note: Lead marked Lost from lead list quick action";
  }

  if (updates.priority === "Hot") {
    return "Admin note: Lead marked Hot from lead list quick action";
  }

  return `Admin note: ${actionLabel} from lead list quick action`;
}

export function AdminLeadsPage() {
  const location = useLocation();
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | LeadStatus>("All");
  const [priority, setPriority] = useState<"All" | LeadPriority>("All");
  const [assignee, setAssignee] = useState<"All" | string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingLeadId, setSavingLeadId] = useState<number | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  const dashboardView = useMemo(() => {
    return new URLSearchParams(location.search).get("view") || "all";
  }, [location.search]);

  const urlAssignee = useMemo(() => {
    return new URLSearchParams(location.search).get("assignee") || "";
  }, [location.search]);

  const effectiveAssignee = urlAssignee || assignee;

  const dashboardViewLabel = dashboardLeadViewLabel(dashboardView);

  const loadLeads = async () => {
    setLoading(true);
    setError("");

    try {
      const apiLeads = await fetchAdminLeads();
      setLeads(apiLeads);
    } catch (err) {
      console.error(err);
      setLeads(listAdminLeads());
      setError("Could not load live backend leads. Showing local fallback, if any.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const search = query.trim().toLowerCase();

    return leads
      .filter((lead) => dashboardLeadViewMatches(lead, dashboardView, leads))
      .sort((first, second) => {
        const newestFirst = () => {
          const createdDelta =
            new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime();
          if (createdDelta !== 0) return createdDelta;

          return Number(second.id || 0) - Number(first.id || 0);
        };

        const operationalFollowUpViews = new Set([
          "call_sheet",
          "followups",
          "overdue",
          "upcoming",
          "no_followup",
          "hot_sla",
          "untouched",
        ]);

        if (!dashboardView || dashboardView === "all" || !operationalFollowUpViews.has(dashboardView)) {
          return newestFirst();
        }

        const weightDelta =
          dashboardView === "call_sheet"
            ? callSheetSortWeight(first) - callSheetSortWeight(second)
            : followUpSortWeight(first) - followUpSortWeight(second);
        if (weightDelta !== 0) return weightDelta;

        const timeDelta = followUpTimeValue(first) - followUpTimeValue(second);
        if (timeDelta !== 0) return timeDelta;

        return newestFirst();
      })
      .filter((lead) => {
        const matchesSearch =
          !search ||
          [
            lead.name,
            lead.phone,
            lead.email,
            lead.society,
            lead.property,
            lead.budget,
            lead.assignedTo,
            lead.followUpAt,
            followUpLabel(lead),
            followUpUrgencyLabel(lead),
            workflowNextAction(lead),
            leadQualitySearchText(lead, leads),
            leadSlaSearchText(lead),
            isCallSheetLead(lead) ? `call sheet today queue ${callSheetReason(lead)}` : "",
            attributionSearchText(lead),
            lead.source,
            lead.source_page,
            lead.page_url,
            lead.referrer,
            lead.cta_label,
            lead.utm_source,
            lead.utm_medium,
            lead.utm_campaign,
            lead.utm_term,
            lead.utm_content,
            lead.lead_intent,
            lead.search_query,
            lead.ai_query,
            lead.entity_type,
            lead.entity_slug,
            lead.requirement,
            sourceLabel(lead.source),
            qaTestLeadSearchText(lead),
            qaTestLeadText(lead),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search);

        const matchesStatus = status === "All" || lead.status === status;
        const matchesPriority = priority === "All" || lead.priority === priority;
        const matchesAssignee =
          !effectiveAssignee ||
          effectiveAssignee === "All" ||
          String(lead.assignedTo || "Unassigned") === effectiveAssignee;

        return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
      });
  }, [dashboardView, effectiveAssignee, leads, priority, query, status]);

  const visibleLeadIds = useMemo(() => filteredLeads.map((lead) => lead.id), [filteredLeads]);

  const selectedLeads = useMemo(() => {
    const selected = new Set(selectedLeadIds);

    return leads.filter((lead) => selected.has(lead.id));
  }, [leads, selectedLeadIds]);

  const selectedTotalCount = selectedLeadIds.length;
  const allVisibleSelected = Boolean(visibleLeadIds.length) && visibleLeadIds.every((id) => selectedLeadIds.includes(id));

  const todayLeads = leads.filter((lead) => isToday(lead.createdAt)).length;
  const activeLeads = leads.filter((lead) => !["Booked", "Lost"].includes(lead.status)).length;
  const bookedLeads = leads.filter((lead) => lead.status === "Booked").length;
  const hotLeads = leads.filter((lead) => lead.priority === "Hot").length;
  const followUpsToday = leads.filter((lead) => followUpState(lead) === "today").length;
  const overdueFollowUps = leads.filter((lead) => followUpState(lead) === "overdue").length;
  const upcomingFollowUps = leads.filter((lead) => followUpState(lead) === "upcoming").length;
  const noFollowUps = leads.filter((lead) => followUpState(lead) === "not_set").length;
  const duplicateLeads = leads.filter((lead) => isDuplicateLead(lead, leads)).length;
  const missingPhoneLeads = leads.filter(isMissingPhoneLead).length;
  const missingRequirementLeads = leads.filter(isMissingRequirementLead).length;
  const highIntentLeads = leads.filter(isHighIntentLead).length;
  const freshLeads = leads.filter(isFreshLead).length;
  const agingLeads = leads.filter(isAgingLead).length;
  const staleLeads = leads.filter(isStaleLead).length;
  const hotSlaLeads = leads.filter(isHotSlaLead).length;
  const untouchedLeads = leads.filter(isUntouchedLead).length;
  const callSheetLeads = leads.filter(isCallSheetLead).length;

  const handleStatusChange = async (lead: AdminLead, nextStatus: LeadStatus) => {
    const previousLeads = leads;

    setSavingLeadId(lead.id);
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status: nextStatus } : item)),
    );

    try {
      const updated = await updateLeadStatusRemote(lead.id, nextStatus);
      if (updated) {
        setLeads((current) => current.map((item) => (item.id === lead.id ? updated : item)));
      }
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setError("Could not update lead status. Please try again.");
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleQuickLeadUpdate = async (
    lead: AdminLead,
    updates: Partial<Pick<AdminLead, "status" | "priority" | "followUpAt">>,
    successMessage: string,
  ) => {
    const previousLeads = leads;
    const optimisticLead = { ...lead, ...updates };

    setSavingLeadId(lead.id);
    setError("");
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? optimisticLead : item)),
    );

    try {
      const updated = await saveAdminLead(optimisticLead);
      const noted = await addLeadNoteRemote(updated, c57QuickActionNote(updates, successMessage));
      setLeads((current) => current.map((item) => (item.id === lead.id ? noted : item)));
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setError(`${successMessage} failed. Please open the lead and try again.`);
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleAssignLead = async (lead: AdminLead, nextAssignee: string) => {
    const previousLeads = leads;
    const optimisticLead = { ...lead, assignedTo: nextAssignee };

    setSavingLeadId(lead.id);
    setError("");
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? optimisticLead : item)),
    );

    try {
      const updated = await saveAdminLead(optimisticLead);
      const noted = await addLeadNoteRemote(
        updated,
        `Admin note: Lead assigned to ${nextAssignee} from C61 team control`,
      );
      setLeads((current) => current.map((item) => (item.id === lead.id ? noted : item)));
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setError("Could not update lead owner. Please try again.");
    } finally {
      setSavingLeadId(null);
    }
  };

  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId],
    );
  };

  const selectAllVisibleLeads = () => {
    setSelectedLeadIds((current) => {
      const merged = new Set([...current, ...visibleLeadIds]);
      return Array.from(merged);
    });
  };

  const clearSelectedLeads = () => {
    setSelectedLeadIds([]);
  };

  const handleExportSelectedLeads = () => {
    if (!selectedLeads.length) {
      setError("Please select at least one lead to export.");
      return;
    }

    exportLeadsCsv(selectedLeads);
  };

  const handleDelete = async (lead: AdminLead) => {
    if (!window.confirm(`Delete lead for ${lead.name}?`)) return;

    const previousLeads = leads;
    setLeads((current) => current.filter((item) => item.id !== lead.id));

    try {
      await deleteAdminLeadRemote(lead.id);
    } catch (err) {
      console.error(err);
      setLeads(previousLeads);
      setError("Could not delete lead. Please try again.");
    }
  };

  return (
    <AdminLayout title="Leads CRM">
      <div className="space-y-4 md:space-y-5">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-700">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            ["Today", todayLeads, "New enquiries", "/admin/leads?view=today"],
            ["Active Leads", activeLeads, "In pipeline", "/admin/leads?view=active"],
            ["Call Sheet", callSheetLeads, "Priority queue", "/admin/leads?view=call_sheet"],
            ["Follow-ups", followUpsToday, "Due today", "/admin/leads?view=followups"],
            ["Overdue", overdueFollowUps, "Needs action", "/admin/leads?view=overdue"],
            ["Upcoming", upcomingFollowUps, "Scheduled", "/admin/leads?view=upcoming"],
            ["No Follow-up", noFollowUps, "Needs reminder", "/admin/leads?view=no_followup"],
            ["Duplicates", duplicateLeads, "Same phone", "/admin/leads?view=duplicates"],
            ["Missing Phone", missingPhoneLeads, "Incomplete", "/admin/leads?view=missing_phone"],
            ["Missing Req.", missingRequirementLeads, "Incomplete", "/admin/leads?view=missing_requirement"],
            ["High Intent", highIntentLeads, "Priority quality", "/admin/leads?view=high_intent"],
            ["Fresh", freshLeads, "New today", "/admin/leads?view=fresh"],
            ["Aging", agingLeads, "1–2 days", "/admin/leads?view=aging"],
            ["Stale", staleLeads, "3+ days", "/admin/leads?view=stale"],
            ["Hot SLA", hotSlaLeads, "Hot + New", "/admin/leads?view=hot_sla"],
            ["Untouched", untouchedLeads, "No follow-up", "/admin/leads?view=untouched"],
            ["Hot Leads", hotLeads, "Priority follow-ups", "/admin/leads?view=hot"],
            ["Booked", bookedLeads, "Closed wins", "/admin/leads?view=booked"],
          ].map(([label, value, helper, href]) => (
            <Link
              key={String(label)}
              to={String(href)}
              className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <p className="text-3xl font-bold text-slate-950">{value}</p>
              <p className="mt-2 text-sm font-medium text-blue-600">{label}</p>
              <p className="mt-1 text-xs text-slate-400">{helper}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:rounded-[32px] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">Lead Inbox</h2>
              <p className="mt-1 text-sm text-slate-500">
                Segmented lead inbox for society enquiries, property enquiries, owner listings, broker listings and AI/general callbacks.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={loadLeads}
                variant="outline"
                className="rounded-full border-slate-200"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => exportLeadsCsv(filteredLeads)}
                variant="outline"
                className="rounded-full border-slate-200"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {dashboardViewLabel || (effectiveAssignee && effectiveAssignee !== "All") ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <span>
                Showing: <strong>{dashboardViewLabel || "Assigned leads"}</strong>
                {effectiveAssignee && effectiveAssignee !== "All" ? (
                  <> · Owner: <strong>{effectiveAssignee}</strong></>
                ) : null}
              </span>
              <Link to="/admin/leads" className="font-semibold hover:underline">
                Clear filter
              </Link>
            </div>
          ) : null}
          {dashboardView === "call_sheet" ? (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
              <strong>C63 daily call sheet:</strong> Work this queue in order — Overdue, Hot SLA, Due Today, Untouched, then Stale. Use Call, WhatsApp, Contacted and Tomorrow from each row.
            </div>
          ) : null}

          {dashboardView === "no_followup" ? (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              <strong>C57 workflow:</strong> “Tomorrow”, “Hot”, “Contacted” and “Lost” now also write CRM timeline notes.
            </div>
          ) : null}

          {dashboardView === "duplicates" ? (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              <strong>C60 duplicate resolution:</strong> Review same-phone enquiries, keep the best/primary lead active, and mark repeated entries as duplicate. The duplicate action sets Lost + Cold and writes a CRM timeline note.
            </div>
          ) : null}

          {["fresh", "aging", "stale", "hot_sla", "untouched"].includes(dashboardView) ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              <strong>C62 SLA control:</strong> Review lead age, hot-not-contacted leads, stale records and untouched enquiries. Use Contacted or Tomorrow to reactivate the pipeline.
            </div>
          ) : null}


          <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {pipelineViews.map((item) => {
              const active = dashboardView === item.view || (!dashboardView && item.view === "all");

              return (
                <Link
                  key={item.view}
                  to={item.view === "all" ? "/admin/leads" : `/admin/leads?view=${item.view}`}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "border-blue-200 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pipelineViewCount(leads, item.view)}
                  </span>
                </Link>
              );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 lg:mt-6 lg:grid-cols-[1fr_180px_180px_190px] lg:gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, phone, source, CTA, campaign, AI/search query, intent or society..."
                className="h-12 rounded-2xl border-slate-200 pl-11"
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "All" | LeadStatus)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as "All" | LeadPriority)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              {priorities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={effectiveAssignee || "All"}
              onChange={(event) => setAssignee(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              <option value="All">All owners</option>
              {agents.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 rounded-[24px] border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                  C64A selection foundation
                </p>
                <p className="mt-1 text-sm font-semibold text-blue-900">
                  {selectedTotalCount ? `${selectedTotalCount} selected` : "Select leads, then export the selected list."}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
                <button
                  type="button"
                  disabled={!visibleLeadIds.length}
                  onClick={allVisibleSelected ? clearSelectedLeads : selectAllVisibleLeads}
                  className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 disabled:opacity-50"
                >
                  {allVisibleSelected ? "Clear selection" : "Select visible"}
                </button>

                <button
                  type="button"
                  disabled={!selectedTotalCount}
                  onClick={handleExportSelectedLeads}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
                >
                  Export selected
                </button>

                <button
                  type="button"
                  disabled={!selectedTotalCount}
                  onClick={clearSelectedLeads}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-500 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 md:mt-6 md:rounded-[24px]">
            <div className="hidden grid-cols-[1.3fr_1.6fr_150px_110px_150px_230px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 xl:grid">
              <span>Lead</span>
              <span>Interest</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Follow-up</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">Loading live backend leads...</div>
            ) : null}

            {!loading && filteredLeads.map((lead) => {
              const hasPhone = canUsePhone(lead.phone);
              const intentSignal = leadIntentSignal(lead);

              return (
                <div
                  key={lead.id}
                  className={`border-b border-slate-200 bg-white px-3 py-4 last:border-0 xl:grid xl:grid-cols-[1.3fr_1.6fr_150px_110px_150px_230px] xl:items-center xl:gap-4 xl:px-5 xl:py-5 ${leadRowAccentClass(lead)}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 xl:block">
                      <div>
                        <label className="mb-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300"
                          />
                          Select
                        </label>
                        <p className="text-base font-bold text-slate-950">{lead.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          {lead.phone ? (
                            <a href={`tel:${cleanPhone(lead.phone)}`} className="inline-flex items-center gap-1 hover:text-blue-700">
                              <Phone className="h-3.5 w-3.5" />
                              {lead.phone}
                            </a>
                          ) : (
                            <span>No phone</span>
                          )}
                          {lead.email ? <span>Email</span> : null}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 xl:items-start">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold xl:mt-3 inline-flex ${sourceClass(lead.source)}`} title={attributionTitle(lead)}>
                          {compactLeadTypeLabel(lead)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          {leadTypeWorkflowLabel(lead)}
                        </span>
                        <div className="mt-1 flex flex-wrap justify-end gap-1 xl:justify-start">
                          {leadQualityBadges(lead, leads).map((badge) => (
                            <span key={badge} className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${leadQualityBadgeClass(badge)}`}>
                              {badge}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 flex flex-wrap justify-end gap-1 xl:justify-start">
                          {leadSlaBadges(lead).map((badge) => (
                            <span key={badge} className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${leadAgeBadgeClass(lead)}`}>
                              {badge}
                            </span>
                          ))}
                        </div>
                        {dashboardView === "call_sheet" ? (
                          <span className={`mt-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${callSheetReasonClass(lead)}`}>
                            Call sheet: {callSheetReason(lead)}
                          </span>
                        ) : null}
                        {dashboardView === "duplicates" ? (
                          <p className="mt-1 text-[11px] font-bold text-amber-700">
                            Same phone leads: {samePhoneLeadCount(lead, leads)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 xl:mt-0 xl:bg-transparent xl:p-0">
                    <p className="font-semibold text-slate-950">{lead.society || "Not specified"}</p>
                    <p className="mt-1 text-sm text-slate-500">{cleanLeadInterestMeta(lead)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${intentSignal.className}`}
                        title={`C112G-FIX2 compact intent: ${intentSignal.helper}`}
                      >
                        {intentSignal.label}
                      </span>
                      {cleanLeadInterestRequirement(lead) && cleanLeadInterestRequirement(lead) !== intentSignal.label ? (
                        <span className="text-xs font-bold text-slate-500">
                          {cleanLeadInterestRequirement(lead)}
                        </span>
                      ) : null}
                    </div>
                    {intentSignal.helper ? (
                      <p className="mt-1 line-clamp-1 text-[11px] font-bold text-slate-400">
                        {intentSignal.helper}
                      </p>
                    ) : null}
                    <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] xl:hidden ${workflowNextActionClass(lead)}`}>
                      Next: {workflowNextAction(lead)}
                    </p>
                    {(lead.search_query || lead.ai_query || lead.cta_label || lead.utm_campaign) ? (
                      <p className="mt-2 line-clamp-2 text-[11px] font-semibold text-slate-400">
                        Source detail: {[lead.ai_query ? `AI: ${lead.ai_query}` : "", lead.search_query ? `Search: ${lead.search_query}` : "", lead.cta_label ? `CTA: ${lead.cta_label}` : "", lead.utm_campaign ? `Campaign: ${lead.utm_campaign}` : ""].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 xl:contents">
                    <div className="rounded-2xl border border-slate-100 bg-white p-2 xl:border-0 xl:p-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 xl:hidden">Status</p>
                      <select
                        value={lead.status}
                        disabled={savingLeadId === lead.id}
                        onChange={(event) => handleStatusChange(lead, event.target.value as LeadStatus)}
                        className={`h-9 max-w-full rounded-full border-0 px-2 text-xs font-bold outline-none disabled:opacity-60 xl:h-10 xl:px-3 xl:text-sm ${statusClass(lead.status)}`}
                      >
                        {statuses
                          .filter((item) => item !== "All")
                          .map((item) => (
                            <option key={item} value={item}>{displayLeadStatusOptionLabel(lead, item)}</option>
                          ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-2 xl:border-0 xl:p-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 xl:hidden">Priority</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold xl:px-3 ${priorityClass(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-2 text-slate-500 xl:border-0 xl:p-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 xl:hidden">Follow-up</p>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold xl:px-3 xl:text-xs ${followUpClass(lead)}`}>
                        {followUpLabel(lead)}
                      </span>
                      <p className="mt-1 hidden items-center gap-1 text-xs xl:flex">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {followUpHelperText(lead)}
                      </p>
                      <p className="mt-1 hidden text-xs xl:block">
                        Owner: {lead.assignedTo || "Unassigned"}
                      </p>
                      <select
                        value={lead.assignedTo || "Unassigned"}
                        disabled={savingLeadId === lead.id}
                        onChange={(event) => void handleAssignLead(lead, event.target.value)}
                        className="mt-2 hidden h-8 w-full rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none disabled:opacity-50 xl:block"
                      >
                        {agents.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <p className={`mt-1 hidden w-fit rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] xl:block ${workflowNextActionClass(lead)}`}>
                        {followUpUrgencyLabel(lead)}
                      </p>
                      <p className="mt-1 hidden text-xs font-semibold text-slate-500 xl:block">
                        Next: {workflowNextAction(lead)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-t border-slate-100 pt-3 xl:mt-0 xl:flex xl:flex-wrap xl:border-t-0 xl:pt-0">
                    <div className={`col-span-4 grid grid-cols-4 gap-1.5 rounded-2xl border p-2 xl:w-full xl:grid-cols-2 ${workflowStripClass(lead)}`}>
                      <button
                        type="button"
                        disabled={savingLeadId === lead.id}
                        onClick={() =>
                          void handleQuickLeadUpdate(
                            lead,
                            { followUpAt: tomorrowFollowUpValue() },
                            "Set tomorrow follow-up",
                          )
                        }
                        className={`rounded-full border px-2 py-1.5 text-[11px] font-black disabled:opacity-50 ${workflowButtonClass(followUpState(lead) === "not_set" ? "amber" : "blue")}`}
                      >
                        Tomorrow
                      </button>

                      <button
                        type="button"
                        disabled={savingLeadId === lead.id || lead.priority === "Hot"}
                        onClick={() =>
                          void handleQuickLeadUpdate(
                            lead,
                            { priority: "Hot" },
                            "Mark Hot",
                          )
                        }
                        className={`rounded-full border px-2 py-1.5 text-[11px] font-black disabled:opacity-50 ${workflowButtonClass("rose")}`}
                      >
                        Hot
                      </button>

                      <button
                        type="button"
                        disabled={savingLeadId === lead.id || lead.status === "Contacted"}
                        onClick={() =>
                          void handleQuickLeadUpdate(
                            lead,
                            { status: "Contacted" },
                            "Mark Contacted",
                          )
                        }
                        className={`rounded-full border px-2 py-1.5 text-[11px] font-black disabled:opacity-50 ${workflowButtonClass("emerald")}`}
                      >
                        Contacted
                      </button>

                      <button
                        type="button"
                        disabled={savingLeadId === lead.id}
                        onClick={() =>
                          void handleQuickLeadUpdate(
                            lead,
                            { status: "Lost", priority: "Cold" },
                            dashboardView === "duplicates" && samePhoneLeadCount(lead, leads) > 1
                              ? "Duplicate lead reviewed"
                              : "Mark Lost",
                          )
                        }
                        className={`rounded-full border px-2 py-1.5 text-[11px] font-black disabled:opacity-50 ${
                          dashboardView === "duplicates" && samePhoneLeadCount(lead, leads) > 1
                            ? workflowButtonClass("amber")
                            : workflowButtonClass("slate")
                        }`}
                      >
                        {dashboardView === "duplicates" && samePhoneLeadCount(lead, leads) > 1 ? "Duplicate" : "Lost"}
                      </button>
                    </div>

                    <Button asChild variant="outline" size="sm" className="rounded-full border-slate-200 px-3">
                      <Link to={`/admin/leads/${lead.id}`}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        Open
                      </Link>
                    </Button>

                    {hasPhone ? (
                      <Button asChild variant="outline" size="icon" className="rounded-full border-slate-200">
                        <a href={`tel:${cleanPhone(lead.phone)}`} aria-label="Call lead">
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    {hasPhone ? (
                      <Button asChild variant="outline" size="icon" className="rounded-full border-emerald-200 text-emerald-700">
                        <a href={whatsappUrl(lead)} target="_blank" rel="noreferrer" aria-label="WhatsApp lead">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}

                    <Button
                      onClick={() => handleDelete(lead)}
                      size="icon"
                      variant="ghost"
                      className="h-10 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete lead"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {!loading && !filteredLeads.length ? (
              <div className="p-10 text-center text-slate-500">
                {pipelineEmptyMessage(dashboardView)}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
