import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { blogPosts } from "@/data/mock-data";

const InsightsPage = () => {
  return (
    <Layout>
      <div className="border-b border-border bg-primary py-12 text-center text-primary-foreground">
        <h1 className="font-display text-3xl font-bold">Actualités & Conseils</h1>
        <p className="mt-2 text-primary-foreground/70">Le marché immobilier havrais décrypté par nos experts.</p>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map(post => (
            <Link key={post.id} to={`/insights/${post.slug}`} className="group">
              <div className="aspect-[16/9] overflow-hidden rounded-lg">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <time>{new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>
                {post.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5">{tag}</span>
                ))}
              </div>
              <h2 className="mt-2 font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default InsightsPage;
