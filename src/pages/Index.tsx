import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, Award, MapPin } from "lucide-react";
import Layout from "@/components/layout/Layout";
import SearchBar from "@/components/property/SearchBar";
import PropertyCard from "@/components/property/PropertyCard";
import { properties, blogPosts } from "@/data/mock-data";
import heroImage from "@/assets/hero-le-havre.jpg";

const Index = () => {
  const latestListings = properties.filter(p => p.status === "available").slice(0, 3);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative flex min-h-[600px] items-center justify-center overflow-hidden lg:min-h-[700px]">
        <img
          src={heroImage}
          alt="Vue aérienne du Havre et de la côte normande"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 w-full max-w-4xl px-4 py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl font-bold leading-tight text-primary-foreground md:text-5xl lg:text-6xl"
          >
            Votre bien d'exception
            <br />
            <span className="text-gradient-gold">au Havre et alentours</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80"
          >
            Depuis 1972, Foch Immobilier vous accompagne dans tous vos projets immobiliers avec expertise et passion.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <SearchBar variant="hero" />
          </motion.div>
        </div>
      </section>

      {/* Latest listings */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Nos dernières annonces</h2>
              <p className="mt-2 text-muted-foreground">Découvrez nos biens récemment mis en vente ou en location.</p>
            </div>
            <Link
              to="/buy"
              className="hidden items-center gap-1 text-sm font-semibold text-accent hover:underline md:flex"
            >
              Voir tout <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestListings.map((property, i) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <PropertyCard property={property} />
              </motion.div>
            ))}
          </div>
          <div className="mt-6 text-center md:hidden">
            <Link to="/buy" className="text-sm font-semibold text-accent hover:underline">
              Voir toutes les annonces →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-border bg-muted/50 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Clock, title: "Depuis 1972", desc: "Plus de 50 ans d'expertise immobilière au Havre" },
              { icon: Shield, title: "Membre UNIS", desc: "Garantie et professionnalisme certifiés" },
              { icon: Award, title: "Accompagnement", desc: "Un suivi personnalisé à chaque étape" },
              { icon: MapPin, title: "Ancrage local", desc: "Le Havre, Sainte-Adresse, Harfleur, Octeville" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                  <item.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Sell */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="overflow-hidden rounded-2xl bg-primary p-8 text-center md:p-12 lg:p-16">
            <h2 className="font-display text-3xl font-bold text-primary-foreground lg:text-4xl">
              Vous souhaitez vendre ?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/70">
              Obtenez une estimation gratuite et sans engagement de votre bien immobilier en quelques minutes.
            </p>
            <Link to="/sell/valuation">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-8 py-3 font-semibold text-accent-foreground shadow-gold transition-colors hover:bg-accent/90"
              >
                Estimer mon bien gratuitement
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Blog preview */}
      <section className="border-t border-border py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground">Actualités & conseils</h2>
              <p className="mt-2 text-muted-foreground">Les dernières tendances du marché immobilier.</p>
            </div>
            <Link to="/insights" className="hidden items-center gap-1 text-sm font-semibold text-accent hover:underline md:flex">
              Tous les articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {blogPosts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/insights/${post.slug}`} className="group block">
                  <div className="aspect-[16/9] overflow-hidden rounded-lg">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5">{tag}</span>
                    ))}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
