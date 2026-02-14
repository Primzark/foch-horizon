import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Award, Shield, Users } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { agents } from "@/data/mock-data";

const AboutPage = () => {
  return (
    <Layout>
      {/* Hero */}
      <div className="border-b border-border bg-primary py-16 text-center text-primary-foreground lg:py-20">
        <h1 className="font-display text-4xl font-bold">L'agence Foch Immobilier</h1>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">
          Depuis 1972, notre agence familiale accompagne les Havrais dans leurs projets immobiliers avec passion et professionnalisme.
        </p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-foreground">Notre histoire</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Fondée en 1972 par la famille Foch, notre agence est l'une des plus anciennes du Havre. Située au cœur de la ville, avenue Foch, nous sommes fiers de perpétuer une tradition d'excellence et de proximité avec nos clients. Trois générations se sont succédé pour construire une expertise unique du marché immobilier havrais.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Membre du syndicat professionnel UNIS, nous garantissons à nos clients un service conforme aux plus hauts standards de la profession. Notre connaissance intime du tissu local nous permet de proposer un accompagnement sur mesure, qu'il s'agisse d'achat, de vente ou de location.
          </p>
        </div>

        {/* Values */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, title: "Expérience", desc: "50+ ans d'expertise immobilière sur le territoire havrais." },
            { icon: Users, title: "Proximité", desc: "Une relation de confiance et un suivi personnalisé." },
            { icon: Shield, title: "Éthique", desc: "Transparence et honnêteté à chaque étape." },
            { icon: Award, title: "Excellence", desc: "Un service premium accessible à tous." },
          ].map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <v.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Team preview */}
        <div className="mt-16 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">Notre équipe</h2>
          <p className="mt-2 text-muted-foreground">Des professionnels passionnés à votre service.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {agents.map(agent => (
              <Link
                key={agent.id}
                to={`/agency/agents/${agent.slug}`}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover text-center"
              >
                <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <span className="font-display text-2xl font-bold text-accent">
                    {agent.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                  {agent.name}
                </h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <p className="mt-1 text-xs text-accent">{agent.specialty}</p>
              </Link>
            ))}
          </div>
          <Link to="/agency/agents" className="mt-6 inline-block text-sm font-semibold text-accent hover:underline">
            Voir toute l'équipe →
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
