import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const ContactPage = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Votre message a bien été envoyé. Nous vous répondrons dans les meilleurs délais.");
  };

  return (
    <Layout>
      <div className="border-b border-border bg-primary py-12 text-center text-primary-foreground">
        <h1 className="font-display text-3xl font-bold">Contactez-nous</h1>
        <p className="mt-2 text-primary-foreground/70">Notre équipe est à votre disposition.</p>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Info */}
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">Foch Immobilier</h2>
            <ul className="mt-6 space-y-4">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Adresse</p>
                  <p>42 avenue Foch, 76600 Le Havre</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Téléphone</p>
                  <a href="tel:0235420001" className="hover:text-accent">02 35 42 00 01</a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <a href="mailto:contact@foch-immobilier.fr" className="hover:text-accent">contact@foch-immobilier.fr</a>
                </div>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Horaires</p>
                  <p>Lundi – Vendredi : 9h-12h30, 14h-18h30</p>
                  <p>Samedi : 9h30-12h30</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Form */}
          <div className="rounded-xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-xl font-semibold text-foreground">Envoyez-nous un message</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder="Nom" required />
                <Input placeholder="Prénom" required />
              </div>
              <Input type="email" placeholder="Email" required />
              <Input type="tel" placeholder="Téléphone" />
              <Input placeholder="Objet" required />
              <Textarea placeholder="Votre message…" rows={5} required />
              <div className="flex items-start gap-2">
                <Checkbox id="contact-consent" required />
                <label htmlFor="contact-consent" className="text-xs leading-tight text-muted-foreground">
                  J'accepte que mes données soient traitées pour répondre à ma demande.{" "}
                  <Link to="/legal/privacy" className="text-accent hover:underline">Politique de confidentialité</Link>
                </label>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-gold">
                Envoyer
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;
