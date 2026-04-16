import Link from "next/link";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";

export const metadata = {
  title: "Terms of Service | SiteLaunch",
  description: "Terms of Service for SiteLaunch, the client onboarding platform.",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant/60">
            Last updated: {lastUpdated}
          </p>

          <div className="mt-8 space-y-8 text-sm text-on-surface-variant leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the SiteLaunch platform (&quot;Service&quot;), operated by WJD Designs
                (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by
                these Terms of Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you may
                not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">2. Description of Service</h2>
              <p>
                SiteLaunch is a multi-tenant SaaS platform that enables businesses to create branded
                client onboarding experiences, collect information through customizable forms, and
                manage client submissions. The Service includes web-based tools, APIs, and related
                services.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">3. Account Registration</h2>
              <p>
                To use certain features of the Service, you must register for an account. You agree to
                provide accurate, current, and complete information during registration and to keep your
                account information updated. You are responsible for safeguarding your password and for
                all activities that occur under your account. You must notify us immediately of any
                unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">4. Subscriptions and Billing</h2>
              <p>
                Some features of the Service require a paid subscription. By subscribing to a paid plan,
                you agree to pay the applicable fees as described at the time of purchase. Subscription
                fees are billed in advance on a recurring basis (monthly or annually) depending on the plan
                you select. You authorize us to charge your payment method on file for all applicable fees.
              </p>
              <p className="mt-3">
                You may cancel your subscription at any time through your account settings. Cancellation
                will take effect at the end of the current billing period. We do not provide refunds for
                partial billing periods unless required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">5. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <p className="mt-2 pl-4">
                (a) violate any applicable law, regulation, or third-party rights;
                (b) upload, transmit, or distribute any content that is unlawful, harmful, threatening,
                abusive, defamatory, or otherwise objectionable;
                (c) interfere with or disrupt the Service or servers or networks connected to the Service;
                (d) attempt to gain unauthorized access to any part of the Service;
                (e) use the Service for any fraudulent or deceptive purpose; or
                (f) collect or harvest any information from the Service without our express consent.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">6. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by WJD Designs
                and are protected by international copyright, trademark, patent, trade secret, and other
                intellectual property laws. You retain ownership of any content you submit through the
                Service, but you grant us a limited license to use, store, and display your content solely
                as necessary to provide the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">7. Your Data</h2>
              <p>
                You retain all rights to data you submit to or collect through the Service (&quot;Your Data&quot;).
                We will not sell, share, or use Your Data for purposes other than providing and improving
                the Service, except as described in our{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                . You are responsible for ensuring you have all necessary rights and consents to collect
                and process any data you gather through the Service, including personal data of your
                end users.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">8. Service Availability</h2>
              <p>
                We strive to maintain high availability of the Service but do not guarantee uninterrupted
                or error-free operation. We may modify, suspend, or discontinue the Service (or any part
                thereof) at any time with or without notice. We will not be liable to you or any third party
                for any modification, suspension, or discontinuation of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, WJD Designs and its officers,
                directors, employees, and agents shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, or any loss of profits or revenues, whether incurred
                directly or indirectly, or any loss of data, use, goodwill, or other intangible losses
                resulting from your use of the Service.
              </p>
              <p className="mt-3">
                In no event shall our aggregate liability exceed the greater of one hundred dollars ($100)
                or the amount you have paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">10. Disclaimer of Warranties</h2>
              <p>
                The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of
                any kind, either express or implied, including but not limited to implied warranties of
                merchantability, fitness for a particular purpose, and non-infringement. We do not
                warrant that the Service will meet your requirements or be available on an uninterrupted,
                secure, or error-free basis.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">11. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless WJD Designs and its officers,
                directors, employees, and agents from and against any claims, liabilities, damages,
                losses, and expenses arising out of or in any way connected with your access to or
                use of the Service, your violation of these Terms, or your violation of any third-party
                rights.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">12. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately,
                without prior notice or liability, for any reason, including if you breach these Terms.
                Upon termination, your right to use the Service will immediately cease. All provisions
                of these Terms that by their nature should survive termination shall survive, including
                ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">13. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of material
                changes by posting the updated Terms on the Service with a new &quot;Last updated&quot; date.
                Your continued use of the Service after the effective date of the revised Terms
                constitutes your acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">14. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the
                United States, without regard to conflict of law principles. Any disputes arising from
                or relating to these Terms or the Service shall be resolved in the courts located in
                the jurisdiction where WJD Designs is established.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-on-surface mb-3">15. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at{" "}
                <a href="mailto:support@mysitelaunch.com" className="text-primary hover:underline">
                  support@mysitelaunch.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-on-surface-variant/50">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
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
