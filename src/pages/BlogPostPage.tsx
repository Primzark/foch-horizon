import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { getBlogPostBySlug } from "@/data/mock-data";

const BlogPostPage = () => {
  const { slug } = useParams();
  const post = getBlogPostBySlug(slug || "");

  if (!post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Article introuvable</h1>
          <Link to="/insights" className="mt-4 inline-block text-accent hover:underline">← Retour</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/insights" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> Actualités
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <time>{new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>
          {post.tags.map(tag => (
            <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5">{tag}</span>
          ))}
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold text-foreground lg:text-4xl">{post.title}</h1>
        <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl">
          <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover" />
        </div>
        <div className="mt-8 leading-relaxed text-muted-foreground">
          <p className="text-lg font-medium text-foreground">{post.excerpt}</p>
          <p className="mt-4">{post.content}</p>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPostPage;
