import type { Template } from "@/components/template-card";

// Single source of truth for mock template data.
// Both the dashboard and the templates pages import from here so they
// always show the same list. When the database is ready, replace this
// file with API calls — nothing else needs to change.

export const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Standard HVAC Maintenance",
    description:
      "Template for heating, ventilation, and air conditioning maintenance contracts with annual inspection schedules.",
    tags: ["HVAC", "Maintenance", "Facilities"],
    icon: "wrench",
    color: "orange",
    owner: { id: "user-1", name: "John Smith" },
    isShared: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: "2",
    name: "IT Support Services",
    description:
      "Comprehensive IT support and maintenance agreement template including SLAs and response times.",
    tags: ["IT", "Support", "SLA"],
    icon: "monitor",
    color: "blue",
    owner: { id: "user-1", name: "John Smith" },
    isShared: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: "3",
    name: "Facilities Management",
    description:
      "Building facilities management and janitorial services contract template.",
    tags: ["Facilities", "Janitorial", "Maintenance"],
    icon: "building",
    color: "purple",
    owner: { id: "user-2", name: "Jane Doe" },
    isShared: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
  },
  {
    id: "4",
    name: "Security Services Agreement",
    description:
      "Physical security and access control services statement of work template.",
    tags: ["Security", "Access Control"],
    icon: "shield",
    color: "red",
    owner: { id: "user-2", name: "Jane Doe" },
    isShared: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "5",
    name: "Grounds Maintenance",
    description: "Landscaping and grounds maintenance services template.",
    tags: ["Landscaping", "Maintenance", "Grounds"],
    icon: "leaf",
    color: "green",
    owner: { id: "user-3", name: "Mike Johnson" },
    isShared: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  },
  {
    id: "6",
    name: "Vehicle Fleet Maintenance",
    description:
      "Government vehicle fleet maintenance and repair services contract.",
    tags: ["Fleet", "Vehicles", "Maintenance"],
    icon: "truck",
    color: "amber",
    owner: { id: "user-1", name: "John Smith" },
    isShared: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
];