import Link from "next/link";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";

export const metadata = {
  title: "Privacy Policy | SiteLaunch",
  description: "Privacy Policy for SiteLaunch, the client onboarding platform.",
};

export default function PrivacyPage() {
  const lastUpdated = "April 15, 2026";

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[160px] pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-6 md:px-10 py-16">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <SiteLaunchLogo className="h-8 w-auto text-primary" ringClassName="text-on-surface/60" />
        </Link>

        <div className="glass-panel rounded-2xl border border-outline-variant/15 p-8 md:p-12">
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant/60">
            Last updated: {lastUpdated}
          </p>

          <div className="mt-8 space-y-8 text-sm text-on-surface-variant leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">1. Introduction</h2>
              <p>
                WJD Designs (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the SiteLaunch
                platform (&quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our Service. Please read this Privacy
                Policy carefully. By using the Service, you consent to the data practices described
                in this policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">2. Information We Collect</h2>

              <p className="font-semibold text-on-surface mt-4 mb-2">2.1 Information You Provide</p>
              <p>
                We collect information you provide directly, including: account registration details
                (name, email address, password), billing and payment information (processed securely
                through Stripe), workspace and branding configuration data, form content and
                configurations you create, and any communications you send to us.
              </p>

              <p className="font-semibold text-on-surface mt-4 mb-2">2.2 Information Collected Automatically</p>
              <p>
                When you access the Service, we may automatically collect: device and browser
                information (type, operating system, browser version), IP address and approximate
                location, usage data (pages visited, features used, timestamps), cookies and similar
                tracking technologies, and log data (server logs, error reports).
              </p>

              <p className="font-semibold text-on-surface mt-4 mb-2">2.3 Information from Third Parties</p>
              <p>
                If you sign in using a third-party provider (such as Google or GitHub), we receive
                your basic profile information (name, email, profile picture) as authorized by your
                settings with that provider.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <p className="mt-2 pl-4">
                (a) provide, maintain, and improve the Service;
                (b) process transactions and send related information;
                (c) send you technical notices, updates, security alerts, and support messages;
                (d) respond to your comments, questions, and customer service requests;
                (e) monitor and analyze trends, usage, and activities in connection with the Service;
                (f) detect, investigate, and prevent security incidents and fraudulent transactions;
                and (g) comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">4. Data Sharing and Disclosure</h2>
              <p>
                We do not sell your personal information. We may share your information only in the
                following circumstances:
              </p>
              <p className="mt-2 pl-4">
                (a) <span className="font-semibold text-on-surface">Service Providers:</span> We share
                data with third-party vendors who perform services on our behalf (e.g., Supabase for
                database and authentication, Stripe for payment processing, Resend for transactional
                email, Vercel for hosting).
              </p>
              <p className="mt-2 pl-4">
                (b) <span className="font-semibold text-on-surface">Legal Requirements:</span> We may
                disclose your information if required to do so by law or in response to valid legal
                process.
              </p>
              <p className="mt-2 pl-4">
                (c) <span className="font-semibold text-on-surface">Business Transfers:</span> In the
                event of a merger, acquisition, or sale of assets, your information may be transferred
                as part of that transaction.
              </p>
              <p className="mt-2 pl-4">
                (d) <span className="font-semibold text-on-surface">With Your Consent:</span> We may
                share your information for any other purpose with your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">5. Data Collected by Your Clients</h2>
              <p>
                As a SiteLaunch user, you may collect personal information from your own clients
                through forms you create on the platform. You are the data controller for this
                information and are responsible for ensuring your data collection practices comply
                with all applicable laws and regulations (including GDPR, CCPA, and other privacy
                laws). We act as a data processor for client submission data and process it only
                as necessary to provide the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">6. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information,
                including encryption in transit (TLS/SSL) and at rest, multi-factor authentication
                support, regular security audits, and access controls. However, no method of
                electronic transmission or storage is 100% secure, and we cannot guarantee
                absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as
                needed to provide the Service to you. When you delete your account, we will delete
                or anonymize your personal information within 30 days, unless we are required to
                retain it for legal or legitimate business purposes. Client submission data is
                retained according to your account settings and deleted when your account is
                terminated.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">8. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <p className="mt-2 pl-4">
                (a) access the personal information we hold about you;
                (b) correct inaccurate or incomplete information;
                (c) request deletion of your personal information;
                (d) object to or restrict certain processing of your data;
                (e) request portability of your data; and
                (f) withdraw consent at any time (where processing is based on consent).
              </p>
              <p className="mt-3">
                To exercise any of these rights, please contact us at{" "}
                <a href="mailto:privacy@mysitelaunch.com" className="text-primary hover:underline">
                  privacy@mysitelaunch.com
                </a>
                . We will respond to your request within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">9. Cookies</h2>
              <p>
                We use essential cookies to operate the Service (authentication, session management).
                We may also use analytics cookies to understand how the Service is used. You can
                control cookie preferences through your browser settings, though disabling essential
                cookies may prevent you from using certain features of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">10. Children&apos;s Privacy</h2>
              <p>
                The Service is not directed to children under the age of 13 (or 16 in the European
                Economic Area). We do not knowingly collect personal information from children. If
                we learn that we have collected personal information from a child, we will take steps
                to delete that information promptly. If you believe we have collected information from
                a child, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">11. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your
                country of residence. These countries may have data protection laws that are different
                from those in your country. We take appropriate measures to ensure that your personal
                information remains protected in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material
                changes by posting the updated policy on the Service with a new &quot;Last updated&quot; date
                and, where required by law, by sending you a notification. Your continued use of the
                Service after the effective date of the revised policy constitutes your acceptance of
                the changes.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">13. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or our data practices, please
                contact us at{" "}
                <a href="mailto:privacy@mysitelaunch.com" className="text-primary hover:underline">
                  privacy@mysitelaunch.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-on-surface-variant/50">
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <span className="text-outline-variant/20">|</span>
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
