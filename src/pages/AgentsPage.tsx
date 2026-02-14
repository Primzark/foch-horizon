import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { agents } from "@/data/mock-data";

const AgentsPage = () => {
  return (
    <Layout>
      <div className="border-b border-border bg-primary py-12 text-center text-primary-foreground">
        <h1 className="font-display text-3xl font-bold">Notre équipe</h1>
        <p className="mt-2 text-primary-foreground/70">Des professionnels passionnés à votre service.</p>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Link
              key={agent.id}
              to={`/agency/agents/${agent.slug}`}
              className="group rounded-xl border border-border bg-card p-8 shadow-card transition-shadow hover:shadow-card-hover text-center"
            >
              <div className="mx-auto h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                <span className="font-display text-3xl font-bold text-accent">
                  {agent.name.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
                {agent.name}
              </h2>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
              <p className="mt-1 text-xs text-accent">{agent.specialty}</p>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{agent.bio}</p>
              <div className="mt-3 flex justify-center gap-2">
                {agent.languages.map(lang => (
                  <span key={lang} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {lang}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AgentsPage;
