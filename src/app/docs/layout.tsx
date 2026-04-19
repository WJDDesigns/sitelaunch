import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import type { ReactNode } from "react";

export const metadata = {
  title: {
    default: "LinqMe Docs",
    template: "%s - LinqMe Docs",
  },
  description:
    "Everything you need to know about building forms, managing clients, and growing your agency with LinqMe.",
};

const navbar = (
  <Navbar
    logo={
      <span className="font-bold text-lg">
        LinqMe <span className="font-normal text-sm opacity-60">Docs</span>
      </span>
    }
    projectLink="https://linqme.app"
  />
);

const footer = (
  <Footer>
    <span>
      {new Date().getFullYear()} LinqMe. All rights reserved.
    </span>
  </Footer>
);

export default async function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Layout
      navbar={navbar}
      footer={footer}
      pageMap={await getPageMap("/docs")}
      docsRepositoryBase="https://github.com/linqme/linqme"
      editLink="Edit this page"
    >
      <Head>
        <link rel="stylesheet" href="/nextra-theme.css" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </Head>
      {children}
    </Layout>
  );
}
