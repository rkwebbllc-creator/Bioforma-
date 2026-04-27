import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "April 26, 2026";

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2
        style={{
          fontFamily: "'Cabinet Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "1.05rem",
          letterSpacing: "-0.02em",
          color: "hsl(220 8% 88%)",
        }}
      >
        {num}. {title}
      </h2>
      <div className="space-y-2.5 text-sm leading-relaxed" style={{ color: "hsl(220 8% 62%)" }}>
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3
        style={{
          fontFamily: "'Cabinet Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: "0.875rem",
          color: "hsl(220 8% 78%)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <div style={{ color: "hsl(220 8% 60%)" }}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: "hsl(220 8% 13%)", margin: "0.5rem 0" }} />;
}

export default function PrivacyPolicy() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "hsl(0 0% 5%)" }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Back link */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "hsl(142 65% 44%)" }}
          data-testid="link-back-settings-privacy"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <h1
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontWeight: 900,
              fontSize: "1.8rem",
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, hsl(0 0% 100%), hsl(220 8% 68%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Privacy Policy
          </h1>
          <p className="text-xs uppercase tracking-wider" style={{ color: "hsl(220 6% 44%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.08em" }}>
            BioForma — Supplement Protocols &amp; Biohacking Hub
          </p>
          <p className="text-sm" style={{ color: "hsl(220 8% 52%)" }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <div
          className="rounded-2xl border p-5 text-sm leading-relaxed"
          style={{
            background: "hsl(220 8% 9%)",
            borderColor: "hsl(220 8% 16%)",
            color: "hsl(220 8% 60%)",
          }}
        >
          <p>
            BioForma ("we", "us", or "our") is committed to protecting your personal information and
            your right to privacy. This Privacy Policy explains what information we collect, how we use
            it, and what rights you have in relation to it. By using BioForma, you agree to the
            collection and use of information in accordance with this policy.
          </p>
        </div>

        <Divider />

        {/* Section 1 */}
        <Section num={1} title="Information We Collect">
          <p>
            We collect information you provide directly to us, information generated through your use
            of the app, and data you choose to import from connected services.
          </p>

          <SubSection title="1.1 Account Information">
            <p>
              When you create an account, we collect your name, email address, and a hashed password.
              We never store your password in plain text.
            </p>
          </SubSection>

          <SubSection title="1.2 Health & Body Composition Data">
            <p>
              When you log InBody scans, we collect: body weight, body fat percentage, skeletal muscle
              mass, BMI, BMR (basal metabolic rate), visceral fat level, body water percentage, bone
              mass, lean body mass, and protein mass. You may also add free-text notes to each scan.
            </p>
          </SubSection>

          <SubSection title="1.3 Supplement & Protocol Data">
            <p>
              We collect information about your supplement stack including names, doses, units, timing
              preferences, schedule days, categories, and protocol assignments. Supplement intake logs
              include the date and time each supplement was taken.
            </p>
          </SubSection>

          <SubSection title="1.4 Nutrition Data">
            <p>
              When you log meals, we collect meal name, calories, protein, carbohydrates, fat, and
              optional notes. We also store your personal daily macro and hydration targets.
            </p>
          </SubSection>

          <SubSection title="1.5 Wearable & Health Metrics">
            <p>
              If you connect Apple Health or a compatible wearable device, we may receive and store:
              heart rate variability (HRV), resting heart rate, sleep duration, deep sleep, REM sleep,
              light sleep, step count, active calories, total calories, blood oxygen saturation (SpO2),
              and respiratory rate.
            </p>
          </SubSection>

          <SubSection title="1.6 Usage Data">
            <p>
              We collect information about how you interact with the app, including feature usage,
              onboarding selections, goal settings, and session behavior. This data is used to improve
              the product and deliver personalized recommendations.
            </p>
          </SubSection>
        </Section>

        <Divider />

        {/* Section 2 */}
        <Section num={2} title="How We Use Your Data">
          <p>We use the information we collect for the following purposes:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Core tracking features</strong> — displaying your supplement stack, nutrition logs, body composition history, and health metrics.</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>AI-powered recommendations</strong> (Pro plan) — generating personalized supplement protocols, optimizing nutrition targets, and providing biohacking insights powered by Anthropic Claude.</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Personalization</strong> — tailoring goal-based onboarding, weekly plans, and dashboard summaries to your specific health objectives.</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Product improvement</strong> — understanding how users interact with the app to improve features, fix bugs, and build new capabilities.</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Communication</strong> — sending important service updates, security notices, or policy changes.</li>
          </ul>
        </Section>

        <Divider />

        {/* Section 3 */}
        <Section num={3} title="Data Storage & Security">
          <p>
            BioForma uses Supabase (a managed Postgres provider hosted on AWS) for primary data
            storage. All your health, supplement, nutrition, and body composition data is stored
            encrypted at rest in our Supabase database, located in U.S. AWS regions. We implement
            industry-standard security measures including:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Authentication tokens issued by Supabase Auth (JWT-based, rotating refresh tokens)</li>
            <li>Row-Level Security (RLS) policies that prevent any user from reading or writing another user's data</li>
            <li>HTTPS / TLS 1.2+ encryption for all data in transit</li>
            <li>Encryption at rest for the underlying Supabase Postgres database</li>
            <li>Restricted access controls and least-privilege server credentials</li>
          </ul>
          <p>
            <strong style={{ color: "hsl(220 8% 76%)" }}>We do not sell your personal data to third parties.</strong> Your health and body composition data is never shared with advertisers or data brokers.
          </p>
        </Section>

        <Divider />

        {/* Section 4 */}
        <Section num={4} title="Third-Party Services">
          <p>BioForma integrates with the following third-party services:</p>

          <SubSection title="4.1 Anthropic Claude (AI Features)">
            <p>
              Pro plan AI recommendations are powered by Anthropic's Claude API. When you request an
              AI recommendation, a minimal, anonymized representation of your relevant data (e.g.,
              supplement names, general goal type) may be sent to Anthropic for processing. No
              personally identifiable information such as your name, email, or precise health metrics
              is shared in these requests. Anthropic's privacy policy governs their handling of this
              data.
            </p>
          </SubSection>

          <SubSection title="4.2 Apple HealthKit">
            <p>
              If you choose to connect Apple HealthKit, BioForma requests read-only access to your
              health metrics. This data is used solely for display and analysis within the BioForma app.
              See Section 5 for full HealthKit disclosure required by Apple.
            </p>
          </SubSection>

          <SubSection title="4.3 RevenueCat (Subscription Management)">
            <p>
              Subscription billing and management is handled through RevenueCat. RevenueCat processes
              payment through the App Store or Google Play. No health or body composition data is
              shared with RevenueCat. RevenueCat's privacy policy governs their handling of billing
              data.
            </p>
          </SubSection>

          <SubSection title="4.4 Supabase (Database & Authentication)">
            <p>
              Supabase is BioForma's primary backend database and authentication provider. When you
              sign up, log in, or save data in BioForma, your account record (email, hashed password
              equivalent, profile info) and your supplement, nutrition, body composition, and health
              metrics records are written to a Supabase Postgres database hosted in U.S. AWS regions.
              Supabase's privacy policy and security practices govern their handling of this data.
              Per-user Row-Level Security ensures other users cannot access your data even at the
              database level.
            </p>
          </SubSection>

          <SubSection title="4.5 Nutrition Label Photo Scanning (Anthropic Vision)">
            <p>
              When you tap “Scan Nutrition Label” to photograph a packaged food, the photo is sent
              to Anthropic's Claude vision API for the sole purpose of extracting the macronutrient
              values from the Nutrition Facts panel. The image is processed in real-time, used only
              to return the structured nutrition data, and is not stored by BioForma after the
              extraction completes. Per Anthropic's API terms, images sent through their API are not
              used to train Anthropic's models. Only the extracted text values (calories, protein,
              carbs, fat, etc.) are saved to your nutrition log.
            </p>
          </SubSection>

          <SubSection title="4.6 Railway (Application Hosting)">
            <p>
              BioForma's web application and API server are hosted on Railway, a U.S.-based
              infrastructure provider. Railway's role is limited to running the application servers
              that route your requests — they do not have access to your account credentials and
              they do not store your health data. Your data lives in Supabase, not on Railway.
            </p>
          </SubSection>
        </Section>

        <Divider />

        {/* Section 5 — Apple HealthKit special section */}
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{
            background: "hsl(4 72% 44% / 0.05)",
            borderColor: "hsl(4 72% 44% / 0.2)",
          }}
        >
          <Section num={5} title="Apple HealthKit Data — Special Disclosure">
            <p>
              This section is required by Apple's App Store Review Guidelines (Section 5.1.3 —
              HealthKit).
            </p>
            <ul className="list-disc list-inside space-y-2 ml-1">
              <li>
                <strong style={{ color: "hsl(220 8% 76%)" }}>HealthKit data is used solely to display your health metrics within BioForma.</strong> We do not use HealthKit data for marketing, advertising, or any purpose unrelated to health and fitness.
              </li>
              <li>
                <strong style={{ color: "hsl(220 8% 76%)" }}>We do NOT sell HealthKit data</strong> to third parties, data brokers, or advertising networks.
              </li>
              <li>
                <strong style={{ color: "hsl(220 8% 76%)" }}>We do NOT use HealthKit data for advertising purposes,</strong> including targeted advertising, ad measurement, or retargeting.
              </li>
              <li>
                <strong style={{ color: "hsl(220 8% 76%)" }}>HealthKit data is not shared with third parties</strong> except as described in Section 4 (RevenueCat receives no health data; Anthropic receives only anonymized, non-HealthKit data).
              </li>
              <li>
                HealthKit permissions are optional. You may use BioForma without granting HealthKit access.
              </li>
            </ul>
          </Section>
        </div>

        <Divider />

        {/* Section 6 */}
        <Section num={6} title="Your Rights">
          <p>You have the following rights regarding your personal data:</p>

          <SubSection title="6.1 Right to Access & Export">
            <p>
              You can download a complete copy of all your BioForma data at any time via{" "}
              <Link
                href="/settings"
                className="underline underline-offset-2 transition-colors"
                style={{ color: "hsl(142 65% 44%)" }}
              >
                Settings → Your Data → Export Your Data
              </Link>
              . Exports are available in JSON and CSV formats.
            </p>
          </SubSection>

          <SubSection title="6.2 Right to Delete">
            <p>
              You may request permanent deletion of your account and all associated data at any time.
              To request deletion, contact us at{" "}
              <a
                href="mailto:rkwebbllc@gmail.com"
                className="underline underline-offset-2 transition-colors"
                style={{ color: "hsl(142 65% 44%)" }}
              >
                rkwebbllc@gmail.com
              </a>
              . Deletion is permanent and irreversible.
            </p>
          </SubSection>

          <SubSection title="6.3 Right to Modify">
            <p>
              You may update your personal information (name, email, goal) at any time via the
              Settings page.
            </p>
          </SubSection>

          <SubSection title="6.4 California Residents (CCPA)">
            <p>
              Under the California Consumer Privacy Act, California residents have the right to: know
              what personal information is collected, know whether personal information is sold or
              disclosed, opt out of the sale of personal information (we do not sell personal
              information), request deletion of personal information, and receive equal service and
              price even if you exercise your privacy rights.
            </p>
          </SubSection>

          <SubSection title="6.5 EU/EEA Residents (GDPR)">
            <p>
              If you are located in the European Economic Area, you have additional rights under the
              General Data Protection Regulation (GDPR), including the right to data portability, the
              right to restriction of processing, and the right to lodge a complaint with a supervisory
              authority. The legal basis for processing your data is contractual necessity (to provide
              the BioForma service) and legitimate interests (product improvement).
            </p>
          </SubSection>
        </Section>

        <Divider />

        {/* Section 7 */}
        <Section num={7} title="Data Retention">
          <p>
            We retain your personal data for as long as your account remains active. When you delete
            your account:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>All personal information is permanently deleted from our servers</li>
            <li>All health, body composition, supplement, and nutrition data is permanently removed</li>
            <li>Deletion is irreversible — we cannot restore deleted accounts</li>
            <li>Deletion requests are processed within 30 days</li>
          </ul>
          <p>
            Anonymized, aggregated analytics data that cannot be linked back to any individual may be
            retained for product improvement purposes.
          </p>
        </Section>

        <Divider />

        {/* Section 8 */}
        <Section num={8} title="Children's Privacy">
          <p>
            BioForma is not intended for users under the age of 16. We do not knowingly collect
            personal information from children under 16. If you are a parent or guardian and believe
            your child has provided us with personal information, please contact us at{" "}
            <a
              href="mailto:rkwebbllc@gmail.com"
              className="underline underline-offset-2"
              style={{ color: "hsl(142 65% 44%)" }}
            >
              rkwebbllc@gmail.com
            </a>{" "}
            and we will promptly delete such information.
          </p>
        </Section>

        <Divider />

        {/* Section 9 */}
        <Section num={9} title="Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by updating the "Last updated" date at the top of this policy and, where
            appropriate, notifying you via email or in-app notification. Your continued use of
            BioForma after any changes constitutes your acceptance of the revised policy.
          </p>
          <p>
            We encourage you to review this Privacy Policy periodically to stay informed about how we
            are protecting your information.
          </p>
        </Section>

        <Divider />

        {/* Section 10 */}
        <Section num={10} title="Contact Us">
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or your
            personal data, please contact us:
          </p>
          <div
            className="rounded-xl border p-4 space-y-1"
            style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
          >
            <p style={{ color: "hsl(220 8% 76%)", fontWeight: 600, fontFamily: "'Cabinet Grotesk', sans-serif" }}>BioForma / RK Webb LLC</p>
            <p>
              Email:{" "}
              <a
                href="mailto:rkwebbllc@gmail.com"
                className="underline underline-offset-2"
                style={{ color: "hsl(142 65% 44%)" }}
              >
                rkwebbllc@gmail.com
              </a>
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-4 pb-8">
          <Divider />
          <p className="text-xs mt-4" style={{ color: "hsl(220 6% 36%)" }}>
            © 2026 RK Webb LLC. All rights reserved. |{" "}
            <Link href="/terms" style={{ color: "hsl(220 6% 48%)" }} className="hover:underline">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
