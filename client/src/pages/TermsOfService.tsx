import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "April 12, 2026";

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

function Divider() {
  return <div style={{ height: "1px", background: "hsl(220 8% 13%)", margin: "0.5rem 0" }} />;
}

export default function TermsOfService() {
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
          data-testid="link-back-settings-terms"
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
            Terms of Service
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
            Please read these Terms of Service ("Terms") carefully before using BioForma ("the App",
            "the Service"), operated by RK Webb LLC ("we", "us", or "our"). By accessing or using
            BioForma, you agree to be bound by these Terms. If you disagree with any part of these
            Terms, you may not use the Service.
          </p>
        </div>

        <Divider />

        {/* Section 1 */}
        <Section num={1} title="Acceptance of Terms">
          <p>
            By creating an account or using any feature of BioForma, you confirm that you have read,
            understood, and agree to be bound by these Terms of Service and our{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2"
              style={{ color: "hsl(142 65% 44%)" }}
            >
              Privacy Policy
            </Link>
            , which is incorporated by reference. These Terms constitute a legally binding agreement
            between you and RK Webb LLC.
          </p>
          <p>
            We reserve the right to update these Terms at any time. We will notify you of material
            changes by updating the date above. Continued use of the Service after changes constitutes
            acceptance of the revised Terms.
          </p>
        </Section>

        <Divider />

        {/* Section 2 */}
        <Section num={2} title="Description of Service">
          <p>
            BioForma is a personal health and biohacking application that provides:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Supplement tracking</strong> — log, schedule, and manage your supplement stack with dose and timing details</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Supplement protocols</strong> — build and activate goal-based supplement protocols</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Nutrition logging</strong> — track daily meals, macros, calories, and hydration targets</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Body composition tracking</strong> — log InBody scan results and track body composition trends over time</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Health metrics</strong> — display wearable data including HRV, sleep, steps, and heart rate</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>AI-powered recommendations</strong> (Pro plan) — receive personalized supplement and nutrition suggestions</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Peptide calculator</strong> — calculate reconstitution dosages for research peptides</li>
            <li><strong style={{ color: "hsl(220 8% 76%)" }}>Research hub</strong> — access educational supplement and biohacking information</li>
          </ul>
          <p>
            BioForma is an informational and tracking tool only. It is NOT a medical device, does NOT
            provide medical diagnoses, and is NOT a substitute for professional healthcare. See
            Section 6 for the full Medical Disclaimer.
          </p>
        </Section>

        <Divider />

        {/* Section 3 */}
        <Section num={3} title="Account Registration">
          <p>To use BioForma, you must:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Be at least <strong style={{ color: "hsl(220 8% 76%)" }}>16 years of age</strong></li>
            <li>Provide accurate and complete registration information (name and valid email address)</li>
            <li>Maintain the security of your password and accept responsibility for all activity under your account</li>
            <li>Promptly notify us of any unauthorized use of your account</li>
          </ul>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials. We are
            not liable for any loss or damage arising from your failure to protect your account
            credentials.
          </p>
          <p>
            We reserve the right to refuse service, terminate accounts, or remove content at our
            discretion.
          </p>
        </Section>

        <Divider />

        {/* Section 4 */}
        <Section num={4} title="Subscription & Billing">
          <p>BioForma offers two service tiers:</p>

          <div
            className="rounded-xl border p-4 space-y-3"
            style={{ background: "hsl(220 8% 9%)", borderColor: "hsl(220 8% 16%)" }}
          >
            <div className="space-y-1">
              <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, color: "hsl(220 8% 80%)", fontSize: "0.875rem" }}>Free Plan</p>
              <p>Access to core supplement tracking (up to 5 supplements), basic nutrition logging, and body composition entry. No cost, no credit card required.</p>
            </div>
            <Divider />
            <div className="space-y-1">
              <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, color: "hsl(46 95% 62%)", fontSize: "0.875rem" }}>BioForma Pro</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Monthly: <strong style={{ color: "hsl(220 8% 76%)" }}>$9.99/month</strong></li>
                <li>Annual: <strong style={{ color: "hsl(220 8% 76%)" }}>$69.99/year</strong> (save ~42%)</li>
              </ul>
              <p>Includes unlimited supplements, AI recommendations, advanced analytics, peptide calculator, and all future Pro features.</p>
            </div>
          </div>

          <p>
            <strong style={{ color: "hsl(220 8% 76%)" }}>Auto-renewal:</strong> Subscriptions automatically renew at the end of each billing period unless cancelled at least 24 hours before the renewal date. Your payment method will be charged through the App Store (iOS) or Google Play (Android).
          </p>
          <p>
            <strong style={{ color: "hsl(220 8% 76%)" }}>Cancellation:</strong> You may cancel your subscription at any time through your device's subscription management settings (App Store or Google Play). Cancellation takes effect at the end of the current billing period. We do not offer refunds for partial subscription periods.
          </p>
          <p>
            <strong style={{ color: "hsl(220 8% 76%)" }}>Price changes:</strong> We reserve the right to adjust pricing with reasonable advance notice. Continued use after a price change constitutes acceptance of the new pricing.
          </p>
        </Section>

        <Divider />

        {/* Section 5 */}
        <Section num={5} title="Acceptable Use">
          <p>By using BioForma, you agree not to:</p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Use the Service for any illegal purpose or in violation of any applicable laws or regulations</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the application</li>
            <li>Use the Service to provide medical advice to others or represent BioForma content as medical guidance</li>
            <li>Upload or transmit any malicious code, viruses, or harmful data</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
            <li>Collect or harvest data from the Service without our express written permission</li>
            <li>Use the peptide calculator or research content to encourage or facilitate illegal activities</li>
          </ul>
          <p>
            Violation of these terms may result in immediate termination of your account without
            notice or refund.
          </p>
        </Section>

        <Divider />

        {/* Section 6 — Medical Disclaimer */}
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{
            background: "hsl(4 72% 44% / 0.05)",
            borderColor: "hsl(4 72% 44% / 0.2)",
          }}
        >
          <Section num={6} title="Medical Disclaimer">
            <p>
              <strong style={{ color: "hsl(220 8% 90%)" }}>
                BIOFORMA IS NOT A MEDICAL DEVICE AND DOES NOT PROVIDE MEDICAL ADVICE.
              </strong>
            </p>
            <p>
              All content, features, and information provided by BioForma — including supplement
              tracking, protocol recommendations, AI suggestions, peptide calculator results, research
              summaries, and nutrition targets — are provided for <strong style={{ color: "hsl(220 8% 78%)" }}>informational and educational purposes only</strong>. Nothing in this application constitutes, or should be interpreted as, medical advice, medical diagnosis, or a recommendation for medical treatment.
            </p>
            <p>
              <strong style={{ color: "hsl(220 8% 78%)" }}>Always consult a qualified healthcare provider</strong> before starting any supplement protocol, peptide regimen, dietary change, or modification to any medication or treatment plan. The information in BioForma is not a substitute for professional medical advice, diagnosis, or treatment.
            </p>
            <p>
              Supplement use and biohacking practices carry inherent risks. Individual results vary
              significantly. BioForma does not guarantee any specific health outcome. Use all
              information and features at your own risk.
            </p>
          </Section>
        </div>

        <Divider />

        {/* Section 7 */}
        <Section num={7} title="Intellectual Property">
          <p>
            <strong style={{ color: "hsl(220 8% 76%)" }}>BioForma platform:</strong> The BioForma application, its design, code, branding, features, and all intellectual property belong to RK Webb LLC. You may not copy, reproduce, distribute, or create derivative works from any part of the BioForma platform without our express written permission.
          </p>
          <p>
            <strong style={{ color: "hsl(220 8% 76%)" }}>Your data:</strong> You retain full ownership of all personal data you enter into BioForma, including your supplement logs, nutrition entries, body composition records, and health metrics. You grant us a limited license to process and store this data solely for the purpose of providing you with the Service.
          </p>
          <p>
            You may export your data at any time via{" "}
            <Link href="/settings" className="underline underline-offset-2" style={{ color: "hsl(142 65% 44%)" }}>
              Settings → Your Data
            </Link>
            .
          </p>
        </Section>

        <Divider />

        {/* Section 8 */}
        <Section num={8} title="Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, BIOFORMA AND RK WEBB LLC SHALL NOT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, HEALTH OUTCOMES, OR GOODWILL ARISING
            OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR
            A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>
          <p>
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID FOR THE SERVICE
            IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </Section>

        <Divider />

        {/* Section 9 */}
        <Section num={9} title="Termination">
          <p>
            We reserve the right to suspend or terminate your account, with or without notice, for:
          </p>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>Violation of these Terms of Service</li>
            <li>Engaging in fraudulent, abusive, or illegal activity</li>
            <li>Actions that harm other users or our infrastructure</li>
            <li>Non-payment of subscription fees</li>
          </ul>
          <p>
            Upon termination, your right to use the Service ceases immediately. If your account is
            terminated for cause, you will not be entitled to a refund of any subscription fees paid.
            You may terminate your account at any time by contacting{" "}
            <a
              href="mailto:rkwebbllc@gmail.com"
              className="underline underline-offset-2"
              style={{ color: "hsl(142 65% 44%)" }}
            >
              rkwebbllc@gmail.com
            </a>
            .
          </p>
        </Section>

        <Divider />

        {/* Section 10 */}
        <Section num={10} title="Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the{" "}
            <strong style={{ color: "hsl(220 8% 76%)" }}>State of Texas, United States of America</strong>, without regard to its conflict of law provisions. Any dispute arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts located in Texas.
          </p>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            will be limited or eliminated to the minimum extent necessary so that the remaining Terms
            remain in full force and effect.
          </p>
        </Section>

        <Divider />

        {/* Section 11 */}
        <Section num={11} title="Contact Us">
          <p>
            If you have questions, concerns, or requests regarding these Terms of Service, please
            contact us:
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
            <Link href="/privacy" style={{ color: "hsl(220 6% 48%)" }} className="hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
