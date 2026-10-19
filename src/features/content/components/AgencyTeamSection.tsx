import { AgentInitialsAvatar } from "@/features/listings/components/AgentInitialsAvatar";
import { agents } from "@/features/listings/data/agents";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { ScrollReveal } from "@/components/visuals/ScrollReveal";
import type { PlaceImageMood } from "@/lib/visuals/placeImageMotion";

export function AgencyTeamSection({ mood = "urban" }: { mood?: PlaceImageMood }) {
  const motionDirector = getMotionDirectorProfile(mood);

  return (
    <section className="container mx-auto px-4 py-12">
      <ScrollReveal mood={mood}>
        <h2 className="font-display text-3xl">L'équipe</h2>
        <p className="mt-1 text-sm text-muted-foreground">Des interlocuteurs identifiés pour chaque projet.</p>
      </ScrollReveal>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {agents.map((agent, index) => (
          <ScrollReveal key={agent.id} mood={mood} delay={Math.min(index * motionDirector.revealStagger, 0.25)}>
            <article className="group rounded-2xl border border-border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_40px_-34px_hsl(var(--brand)/0.3)]">
              <AgentInitialsAvatar name={agent.fullName} className="h-16 w-16 text-sm transition-transform duration-300 group-hover:scale-105" />
              <h3 className="mt-3 font-display text-xl">{agent.fullName}</h3>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
              <a className="mt-2 block text-sm hover:underline" href={`tel:${agent.phone.replace(/\s+/g, "")}`}>
                {agent.phone}
              </a>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
