import { useParams, Link } from "react-router-dom";
import { Phone, Mail, ArrowLeft } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PropertyCard from "@/components/property/PropertyCard";
import { getAgentBySlug, properties } from "@/data/mock-data";
import { Button } from "@/components/ui/button";

const AgentDetail = () => {
  const { slug } = useParams();
  const agent = getAgentBySlug(slug || "");

  if (!agent) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Agent introuvable</h1>
          <Link to="/agency/agents" className="mt-4 inline-block text-accent hover:underline">← Retour</Link>
        </div>
      </Layout>
    );
  }

  const agentListings = properties.filter(p => p.agent_id === agent.id && p.status === "available");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Link to="/agency/agents" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> Notre équipe
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-8 shadow-card text-center">
            <div className="mx-auto h-28 w-28 rounded-full bg-muted flex items-center justify-center">
              <span className="font-display text-4xl font-bold text-accent">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </span>
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-foreground">{agent.name}</h1>
            <p className="text-muted-foreground">{agent.role}</p>
            <p className="mt-1 text-sm text-accent">{agent.specialty}</p>
            <div className="mt-4 flex justify-center gap-2">
              {agent.languages.map(lang => (
                <span key={lang} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{lang}</span>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <a href={`tel:${agent.phone.replace(/\s/g, "")}`}>
                <Button variant="outline" className="w-full justify-center gap-2">
                  <Phone className="h-4 w-4 text-accent" /> {agent.phone}
                </Button>
              </a>
              <a href={`mailto:${agent.email}`}>
                <Button variant="outline" className="w-full justify-center gap-2 mt-2">
                  <Mail className="h-4 w-4 text-accent" /> {agent.email}
                </Button>
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-semibold text-foreground">À propos</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{agent.bio}</p>

            {agentListings.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Ses biens ({agentListings.length})
                </h2>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  {agentListings.map(p => <PropertyCard key={p.id} property={p} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AgentDetail;
