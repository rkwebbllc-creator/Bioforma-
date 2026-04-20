import { useAuth } from "@/lib/auth";
import { ProGate } from "@/components/ProGate";
import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE, authFetch } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Search,
  Send,
  Bot,
  User,
  FlaskConical,
  BookOpen,
  MessageCircle,
  X,
  Loader2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PeptideInfo {
  name: string;
  aliases: string[];
  category: string;
  summary: string;
  mechanism: string;
  benefits: string[];
  protocol: string;
  dosing: string;
  reconstitution: string;
  halfLife: string;
  sideEffects: string[];
  synergies: string[];
  research: string;
  caution: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─────────────────────────────────────────────
// Peptide Data
// ─────────────────────────────────────────────

const PEPTIDES: PeptideInfo[] = [
  {
    name: "BPC-157",
    aliases: ["Body Protection Compound", "BPC157", "PL 14736"],
    category: "Injury & Recovery",
    summary:
      "A pentadecapeptide derived from a protective gastric protein. Widely studied for its remarkable ability to accelerate tissue healing across multiple organ systems.",
    mechanism:
      "Upregulates growth hormone receptors, stimulates nitric oxide synthesis, and promotes angiogenesis (new blood vessel formation). Acts on the tendon-to-bone interface via the GH/IGF-1 axis while also modulating dopamine and serotonin pathways.",
    benefits: [
      "Accelerates tendon, ligament, and muscle repair",
      "Reduces inflammation at injury sites",
      "Promotes gut healing and improves GI permeability",
      "Supports joint cartilage regeneration",
      "Neuroprotective and antidepressant effects in some studies",
    ],
    protocol:
      "Daily subcutaneous or intramuscular injection for 4–12 weeks, ideally near the injury site. Oral/intranasal routes used for GI issues.",
    dosing: "200–500 mcg per day",
    reconstitution: "5 mg vial + 2 mL BAC water = 2,500 mcg/mL",
    halfLife: "~4 hours",
    sideEffects: [
      "Mild nausea (rare)",
      "Injection site irritation",
      "Dizziness at higher doses",
      "Possible nausea if taken orally on empty stomach",
    ],
    synergies: ["TB-500", "GHK-Cu", "KPV", "NAD+"],
    research:
      "Robust animal data; numerous rodent studies demonstrate consistent healing effects. Limited human clinical trials exist — currently in Phase II for inflammatory bowel disease.",
    caution:
      "Not FDA-approved. Sourced as research chemical. Quality and purity vary significantly by vendor.",
  },
  {
    name: "TB-500",
    aliases: ["Thymosin Beta-4", "Tβ4", "TB500"],
    category: "Injury & Recovery",
    summary:
      "A synthetic version of the naturally occurring peptide Thymosin Beta-4. Promotes systemic healing, flexibility, and recovery from chronic injuries.",
    mechanism:
      "Upregulates actin-binding protein, enabling cell migration and tissue regeneration. Promotes stem cell activation, reduces inflammation via NF-κB pathway inhibition, and enhances angiogenesis.",
    benefits: [
      "Accelerates healing of muscles, tendons, and ligaments",
      "Improves flexibility and reduces muscle stiffness",
      "Anti-inflammatory, especially for chronic injuries",
      "Promotes hair growth (topically)",
      "Cardiac tissue repair in some studies",
    ],
    protocol:
      "Loading phase: 2–2.5 mg twice per week for 4–6 weeks. Maintenance: 2 mg once per week or every two weeks.",
    dosing: "2–2.5 mg per injection, 2–4 mg/week total",
    reconstitution: "5 mg vial + 2 mL BAC water = 2,500 mcg/mL",
    halfLife: "~4–6 hours; systemic effects last significantly longer",
    sideEffects: [
      "Fatigue shortly after injection",
      "Head rush or lightheadedness",
      "Nausea (uncommon)",
      "Injection site redness",
    ],
    synergies: ["BPC-157", "GHK-Cu", "Ipamorelin/CJC-1295"],
    research:
      "Strong preclinical data in rodents and horses. Thymosin Beta-4 studied in human cardiac trials. TB-500 itself has limited direct human trials.",
    caution:
      "Potential concern in individuals with cancer history — promotes cell migration and angiogenesis. Consult an oncologist if applicable.",
  },
  {
    name: "CJC-1295",
    aliases: ["CJC1295", "Modified GRF 1-29", "DAC:GRF"],
    category: "Hormonal",
    summary:
      "A long-acting GHRH (Growth Hormone Releasing Hormone) analogue that stimulates pulsatile GH release from the pituitary gland, mimicking natural physiology.",
    mechanism:
      "Binds to and activates GHRH receptors on pituitary somatotrophs, amplifying GH pulse amplitude. The DAC (Drug Affinity Complex) modification extends half-life dramatically by binding to albumin.",
    benefits: [
      "Sustained elevation of GH and IGF-1 levels",
      "Improved body composition (fat loss, lean mass gain)",
      "Enhanced sleep quality",
      "Faster recovery from exercise",
      "Anti-aging effects on skin and connective tissue",
    ],
    protocol:
      "Typically used with Ipamorelin (GHRP). Inject 1–3× weekly (with DAC) or nightly (without DAC). Best taken before bed on an empty stomach.",
    dosing: "100–300 mcg per injection",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~6–8 days (with DAC); ~30 minutes (without DAC/Mod GRF)",
    sideEffects: [
      "Water retention, especially early on",
      "Tingling or numbness (carpal tunnel-like)",
      "Fatigue or lethargy",
      "Increased hunger",
      "Flushing at injection site",
    ],
    synergies: ["Ipamorelin", "Hexarelin", "IGF-1 LR3", "BPC-157"],
    research:
      "Human clinical trials exist — studied for GH deficiency and HIV wasting. Well-characterized pharmacokinetics.",
    caution:
      "Can suppress natural GHRH pulsatility with extended use. Not for use in individuals with active malignancy.",
  },
  {
    name: "Ipamorelin",
    aliases: ["Ipamorelin acetate", "NNC 26-0161"],
    category: "Hormonal",
    summary:
      "A highly selective GHRP (Growth Hormone Releasing Peptide) that stimulates GH release with minimal impact on cortisol or prolactin — the cleanest GHRP available.",
    mechanism:
      "Acts as a ghrelin mimetic, binding to the GHS-R1a receptor in the pituitary and hypothalamus to stimulate selective GH pulses. Does not significantly elevate ACTH, cortisol, or aldosterone.",
    benefits: [
      "Clean GH pulses without cortisol spikes",
      "Improved sleep quality and recovery",
      "Lean mass accretion over time",
      "Fat loss, particularly visceral",
      "Minimal suppression of natural GH axis",
    ],
    protocol:
      "100–200 mcg subcutaneously 2–3× daily. Most effective when taken before sleep and/or post-workout. Stack with CJC-1295 for synergistic GH release.",
    dosing: "100–300 mcg per injection",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~2 hours",
    sideEffects: [
      "Mild water retention",
      "Increased appetite",
      "Mild headache",
      "Injection site irritation",
    ],
    synergies: ["CJC-1295", "Hexarelin", "IGF-1 LR3", "BPC-157"],
    research:
      "Multiple human trials. Studied for muscle wasting, obesity, and GH deficiency. Strong safety and selectivity profile.",
    caution:
      "Avoid carbohydrate-heavy meals 1–2 hours before injection to maximize GH release. Long-term desensitization possible with continuous use.",
  },
  {
    name: "GHK-Cu",
    aliases: ["Copper Peptide", "GHK-Copper", "Glycyl-L-histidyl-L-lysine"],
    category: "Longevity",
    summary:
      "A naturally occurring copper-binding tripeptide found in human plasma, urine, and saliva. Concentrations decline dramatically with age, correlating with reduced regenerative capacity.",
    mechanism:
      "Activates over 4,000 genes related to tissue repair, inflammation control, and antioxidant defense. Promotes collagen, elastin, and glycosaminoglycan synthesis. Modulates TGF-β, VEGF, and FGF signaling.",
    benefits: [
      "Stimulates collagen and elastin synthesis",
      "Skin regeneration and anti-aging effects",
      "Anti-inflammatory and antioxidant",
      "Hair follicle stimulation",
      "Wound healing acceleration",
      "Potential neurological protection",
    ],
    protocol:
      "Subcutaneous injection: 1–2 mg daily or every other day. Topical use: applied directly to skin or scalp 1–2× daily.",
    dosing: "0.5–2 mg per injection; topical formulations vary",
    reconstitution: "5 mg vial + 2.5 mL BAC water = 2,000 mcg/mL",
    halfLife: "~1–2 hours (injected)",
    sideEffects: [
      "Skin redness or rash (especially topical)",
      "Copper accumulation risk at very high doses",
      "Mild injection site irritation",
    ],
    synergies: ["BPC-157", "Epitalon", "NAD+", "TB-500"],
    research:
      "Extensively studied in cell culture and animal models. Some human cosmetic studies. Strong mechanistic data via gene expression analysis.",
    caution:
      "Avoid in individuals with Wilson's disease (copper metabolism disorder). Topical formulations at high concentrations can cause contact dermatitis.",
  },
  {
    name: "Selank",
    aliases: ["Selanك", "TP-7", "Thr-Lys-Pro-Arg-Pro-Gly-Pro"],
    category: "Cognitive",
    summary:
      "A synthetic analogue of the endogenous immunomodulatory peptide tuftsin. Developed in Russia as an anxiolytic nootropic with no dependence potential.",
    mechanism:
      "Modulates GABA-A receptors (benzodiazepine-like effect without tolerance), increases BDNF expression, and regulates enkephalin metabolism. Influences serotonin, dopamine, and norepinephrine systems.",
    benefits: [
      "Reduces anxiety without sedation",
      "Improves memory consolidation and recall",
      "Enhances focus and mental clarity",
      "Mood stabilization",
      "Immune modulation (tuftsin-derived activity)",
    ],
    protocol:
      "Intranasal: 2–3 drops (250–500 mcg) per nostril 2× daily for 10–14 day cycles. Subcutaneous injections also used.",
    dosing: "250–1,000 mcg per day, divided doses",
    reconstitution: "N/A for intranasal solution; 5 mg vial + 2.5 mL for injectable",
    halfLife: "~1–2 hours",
    sideEffects: [
      "Mild drowsiness (rare)",
      "Nasal irritation with intranasal use",
      "Headache (uncommon)",
    ],
    synergies: ["Semax", "NAD+", "DSIP"],
    research:
      "Several Russian clinical trials demonstrating anxiolytic and nootropic effects. Limited Western peer-reviewed data. Approved as a drug in Russia.",
    caution:
      "Not FDA-approved. Avoid combining with CNS depressants. Cycle use to prevent tolerance to cognitive effects.",
  },
  {
    name: "Semax",
    aliases: ["ACTH 4-7 Pro-Gly-Pro", "Semaks"],
    category: "Cognitive",
    summary:
      "A synthetic analogue of ACTH(4-7) developed by the Russian Academy of Sciences. A potent nootropic and neuroprotectant with rapid onset of cognitive enhancement.",
    mechanism:
      "Increases BDNF and NGF production in the hippocampus and frontal cortex, enhances dopamine and serotonin transmission, and reduces oxidative stress. Modulates melanocortin receptors.",
    benefits: [
      "Rapid enhancement of focus, memory, and processing speed",
      "Neuroprotection following stroke or TBI",
      "Reduces anxiety and depression symptoms",
      "Increases BDNF — promotes neuroplasticity",
      "Stimulant-like cognitive clarity without jitteriness",
    ],
    protocol:
      "Intranasal: 1–2 drops (200–600 mcg) per nostril. Cycles of 2 weeks on, 2 weeks off. Also available as injectable.",
    dosing: "200–900 mcg per day (intranasal), typically split into 2 doses",
    reconstitution: "N/A for nasal spray; 5 mg vial + 2.5 mL for injectable",
    halfLife: "~20 minutes (peptide); BDNF effects persist hours to days",
    sideEffects: [
      "Nasal irritation",
      "Mild anxiety or overstimulation at high doses",
      "Headache",
      "Vivid dreams",
    ],
    synergies: ["Selank", "NAD+", "GHK-Cu"],
    research:
      "Approved drug in Russia for stroke rehabilitation and cognition. Several published human trials. Limited Western regulatory review.",
    caution:
      "Avoid in individuals with seizure disorders. May increase anxiety in those predisposed. Not for continuous indefinite use.",
  },
  {
    name: "DSIP",
    aliases: ["Delta Sleep-Inducing Peptide", "DSIP peptide"],
    category: "Sleep & Recovery",
    summary:
      "A naturally occurring neuropeptide that promotes slow-wave (delta) sleep and exerts regulatory effects on stress hormones and pain signaling.",
    mechanism:
      "Modulates GABA-B and opiate receptors, decreases somatostatin release (allowing GH pulses during sleep), and regulates cortisol and LH release. Promotes synchronization of sleep EEG patterns.",
    benefits: [
      "Deepens slow-wave sleep quality",
      "Reduces sleep onset latency",
      "Lowers cortisol during sleep",
      "Enhances GH pulse during deep sleep",
      "Mild analgesic effects",
      "May reduce withdrawal symptoms",
    ],
    protocol:
      "200–400 mcg subcutaneous injection 30–60 minutes before bed. Use for 5–10 days at a time; results may persist beyond active use.",
    dosing: "100–500 mcg per administration",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~30–60 minutes",
    sideEffects: [
      "Morning grogginess (rare)",
      "Mild hypotension",
      "Vivid dreams",
      "Injection site discomfort",
    ],
    synergies: ["Epitalon", "Selank", "Ipamorelin", "GABA supplements"],
    research:
      "Discovered in 1977; reasonable body of research supporting sleep EEG effects. Most studies are older and not replicated in modern controlled trials.",
    caution:
      "Avoid in individuals with hypotension. Do not operate machinery after administration. Use caution if combining with other sedatives.",
  },
  {
    name: "NAD+",
    aliases: ["Nicotinamide Adenine Dinucleotide", "NAD", "NMN precursor"],
    category: "Longevity",
    summary:
      "A critical coenzyme found in every living cell that declines ~50% from age 40 to 60. Fundamental to energy metabolism, DNA repair, and sirtuins (longevity proteins).",
    mechanism:
      "Acts as an electron carrier in the mitochondrial electron transport chain, powers PARP enzymes for DNA repair, and activates sirtuin deacetylases (SIRT1–7). Modulates circadian rhythm via CLOCK genes.",
    benefits: [
      "Enhanced energy and reduced fatigue",
      "Improved mitochondrial function",
      "DNA repair capacity",
      "Cognitive clarity and neuroprotection",
      "Metabolic optimization and insulin sensitivity",
      "Potential cardiovascular protection",
    ],
    protocol:
      "IV infusion: 500–1,500 mg over 4–8 hours weekly or monthly. Subcutaneous: 100–200 mg daily. Oral precursors (NMN/NR): 500–1,000 mg/day.",
    dosing: "100–1,500 mg depending on route",
    reconstitution: "Typically supplied as lyophilized powder; reconstitute per supplier guidelines",
    halfLife: "~1–3 hours (IV); intracellular effects last much longer",
    sideEffects: [
      "Flushing, warmth (especially IV — infuse slowly)",
      "Nausea during rapid infusion",
      "Headache",
      "Transient hypoglycemia",
      "Fatigue post-infusion",
    ],
    synergies: ["GHK-Cu", "Epitalon", "MOTS-c", "Resveratrol", "Apigenin"],
    research:
      "Extensive preclinical and growing human clinical trial data. Studies in aging, neurodegeneration, metabolic disease, and exercise performance. Multiple Phase 2/3 trials ongoing.",
    caution:
      "IV administration should be done in a clinical setting. Patients on anticoagulants should exercise caution. May theoretically support cancer cell metabolism — discuss with oncologist.",
  },
  {
    name: "Retatrutide",
    aliases: ["LY3437943", "Triple agonist GLP-1/GIP/Glucagon"],
    category: "Fat Loss",
    summary:
      "A novel triple hormone receptor agonist (GLP-1, GIP, and glucagon receptors) demonstrating unprecedented weight loss outcomes in Phase 2 clinical trials.",
    mechanism:
      "Simultaneously activates GLP-1 receptors (reduces appetite, slows gastric emptying), GIP receptors (enhances insulin secretion, improves adipocyte metabolism), and glucagon receptors (boosts thermogenesis and energy expenditure).",
    benefits: [
      "Mean 24% body weight reduction in Phase 2 trials",
      "Significant reduction in visceral fat",
      "Improved glycemic control",
      "Potential improvement in liver disease (NASH/MAFLD)",
      "Cardiovascular risk factor reduction",
    ],
    protocol:
      "Weekly subcutaneous injection with dose escalation. Starting dose: 0.5 mg/week, titrating up to 8–12 mg/week over months.",
    dosing: "0.5–12 mg weekly (escalating)",
    reconstitution: "Typically pre-filled pen; research grade as vial + BAC water",
    halfLife: "~6–10 days",
    sideEffects: [
      "Nausea and vomiting (most common, especially during titration)",
      "Diarrhea or constipation",
      "Decreased appetite (intended effect)",
      "Fatigue",
      "Increased heart rate",
    ],
    synergies: ["AOD-9604", "NAD+", "MOTS-c"],
    research:
      "Phase 2 trial published in NEJM showing ~24% weight loss at 48 weeks — superior to any previous GLP-1 agent. Phase 3 trials ongoing as of 2025.",
    caution:
      "Risk of thyroid C-cell tumors in rodents — contraindicated with personal/family history of medullary thyroid carcinoma or MEN2. Risk of pancreatitis. Not for Type 1 diabetes.",
  },
  {
    name: "MOTS-c",
    aliases: ["Mitochondrial Open Reading Frame of the 12S rRNA-c", "MOTS c"],
    category: "Longevity",
    summary:
      "A mitochondria-derived peptide encoded in mitochondrial DNA that acts as a metabolic regulator, improving insulin sensitivity, exercise capacity, and longevity markers.",
    mechanism:
      "Activates AMPK signaling (the cellular energy sensor), enters the nucleus to regulate gene expression, and modulates folate and methionine cycles. Increases with exercise and declines with age.",
    benefits: [
      "Dramatically improved insulin sensitivity",
      "Enhanced exercise performance and endurance",
      "Weight management and reduced visceral fat",
      "Anti-aging effects — extends lifespan in mice",
      "Improved cardiovascular health markers",
    ],
    protocol:
      "5–10 mg subcutaneous injection, 3–5× per week. Cycling recommended: 4–6 weeks on, 2 weeks off.",
    dosing: "5–10 mg per injection",
    reconstitution: "10 mg vial + 1 mL BAC water = 10,000 mcg/mL (10 mg/mL)",
    halfLife: "~4–6 hours",
    sideEffects: [
      "Injection site discomfort",
      "Mild fatigue immediately post-injection",
      "Transient hypoglycemia in insulin-sensitive individuals",
    ],
    synergies: ["NAD+", "Epitalon", "GHK-Cu", "Metformin (off-label)"],
    research:
      "Discovered in 2013. Preclinical data very promising for metabolic and aging endpoints. Initial human studies emerging as of 2024–2025.",
    caution:
      "Hypoglycemia risk — monitor blood glucose, especially in diabetics on medications. Limited long-term human safety data.",
  },
  {
    name: "PT-141",
    aliases: ["Bremelanotide", "PT141"],
    category: "Hormonal",
    summary:
      "A melanocortin receptor agonist originally derived from Melanotan II. FDA-approved (as Vyleesi) for hypoactive sexual desire disorder in premenopausal women.",
    mechanism:
      "Activates melanocortin receptors MC3R and MC4R in the hypothalamus and limbic system, directly increasing sexual desire via central nervous system pathways — independent of vascular effects unlike PDE5 inhibitors.",
    benefits: [
      "Increases sexual desire and arousal in both men and women",
      "Effective for erectile dysfunction (centrally mediated)",
      "Works without sexual stimulation required",
      "Does not require cardiovascular health for efficacy",
      "Potential for treatment-resistant cases",
    ],
    protocol:
      "0.5–2 mg subcutaneous injection 30–60 minutes before sexual activity. No more than once per 24 hours. Start low (0.5 mg) and titrate.",
    dosing: "0.5–2 mg per use, as needed",
    reconstitution: "10 mg vial + 5 mL BAC water = 2,000 mcg/mL",
    halfLife: "~2–3 hours (active period 6–12 hours)",
    sideEffects: [
      "Nausea (most common — transient)",
      "Flushing and warmth",
      "Headache",
      "Transient blood pressure increase",
      "Hyperpigmentation with repeated use",
    ],
    synergies: ["Oxytocin (intranasal)", "Tadalafil (low dose)"],
    research:
      "FDA-approved as Vyleesi for HSDD in women. Studied in men for erectile dysfunction. Well-characterized safety profile in clinical trials.",
    caution:
      "Do not use with cardiovascular disease without physician clearance — causes transient BP elevation. Avoid with high-risk cardiac history. FDA-approved version for women only.",
  },
  {
    name: "Epitalon",
    aliases: ["Epithalon", "Epithalamine", "Ala-Glu-Asp-Gly"],
    category: "Longevity",
    summary:
      "A tetrapeptide derived from the pineal gland extract Epithalamin. Studied extensively by Russian researchers as a powerful anti-aging agent and telomere lengthener.",
    mechanism:
      "Stimulates telomerase enzyme activity, potentially extending telomere length. Regulates melatonin production via the pineal gland, normalizes circadian rhythms, and modulates neuroendocrine function.",
    benefits: [
      "Telomere elongation and DNA protection",
      "Improved sleep via melatonin regulation",
      "Anti-tumor properties observed in animal studies",
      "Extended lifespan in multiple animal models",
      "Restoration of youthful hormone patterns",
    ],
    protocol:
      "5–10 mg daily for 10–20 days, administered 1–2× per year (Russian research protocol). Subcutaneous or intramuscular injection.",
    dosing: "5–10 mg per day (cycle protocol)",
    reconstitution: "10 mg vial + 2 mL BAC water = 5,000 mcg/mL",
    halfLife: "~1–2 hours",
    sideEffects: [
      "Injection site irritation",
      "Mild fatigue during course",
      "Vivid dreams (from melatonin modulation)",
    ],
    synergies: ["DSIP", "GHK-Cu", "NAD+", "MOTS-c"],
    research:
      "Extensive Russian research over 35+ years including human trials. Limited Western peer-reviewed data. Compelling animal lifespan extension studies.",
    caution:
      "Theoretical concern about telomerase activation in cancer cells. Avoid in individuals with known malignancy. Long-term safety in humans not fully established.",
  },
  {
    name: "Thymosin Alpha-1",
    aliases: ["Tα1", "Thymalfasin", "Zadaxin", "TA1"],
    category: "Immune",
    summary:
      "A 28-amino-acid peptide naturally secreted by the thymus gland. FDA-designated orphan drug and approved in 35+ countries for hepatitis B/C, cancer support, and immunodeficiency.",
    mechanism:
      "Augments T-cell maturation and differentiation, enhances dendritic cell function, increases IL-2 production, and modulates Th1/Th2 balance. Acts as an endogenous thymic hormone regulating adaptive immunity.",
    benefits: [
      "Immune system modulation and enhancement",
      "Antiviral activity (hepatitis B and C)",
      "Cancer immunotherapy adjunct",
      "Reduced frequency of infections",
      "Improved vaccine responsiveness",
    ],
    protocol:
      "900 mcg – 1.6 mg subcutaneous injection, 2× per week. Duration varies: 6 months for hepatitis protocols; shorter cycles for general immune support.",
    dosing: "900 mcg – 3.2 mg per injection (1.6 mg is standard clinical dose)",
    reconstitution: "5 mg vial + 2.5 mL sterile water = 2,000 mcg/mL",
    halfLife: "~2 hours",
    sideEffects: [
      "Injection site reactions",
      "Mild flu-like symptoms initially",
      "Fatigue",
      "Rare: elevated liver enzymes",
    ],
    synergies: ["LL-37", "BPC-157", "NAD+"],
    research:
      "Approved drug (Zadaxin) in 35+ countries. Extensive clinical trial data for hepatitis, cancer, and sepsis. Strong human evidence base.",
    caution:
      "Use caution in autoimmune conditions — may amplify immune activity. Avoid in organ transplant recipients (risk of rejection). Monitor liver enzymes with extended use.",
  },
  {
    name: "KPV",
    aliases: ["Lys-Pro-Val", "Alpha-MSH tripeptide", "KPV tripeptide"],
    category: "Injury & Recovery",
    summary:
      "A tripeptide derived from the C-terminus of alpha-melanocyte-stimulating hormone (α-MSH). Potent anti-inflammatory agent particularly effective for gut and skin conditions.",
    mechanism:
      "Binds to melanocortin receptors MC1R and MC3R on immune cells, inhibiting NF-κB signaling and suppressing pro-inflammatory cytokines (IL-1β, IL-6, TNF-α). Penetrates cells directly via intracellular receptor binding.",
    benefits: [
      "Potent anti-inflammatory — gut and systemic",
      "Accelerates wound healing",
      "Reduces skin inflammation (acne, eczema, psoriasis)",
      "Improves inflammatory bowel disease markers",
      "Antimicrobial properties",
    ],
    protocol:
      "Oral (for gut): 500 mcg – 1 mg daily. Subcutaneous: 500 mcg – 1 mg 1–2× daily. Topical for skin conditions.",
    dosing: "500 mcg – 2 mg per day",
    reconstitution: "5 mg vial + 5 mL BAC water = 1,000 mcg/mL",
    halfLife: "~1–2 hours",
    sideEffects: [
      "Minimal reported side effects",
      "Mild injection site irritation",
      "Potential pigmentation changes at high doses (melanocortin effect)",
    ],
    synergies: ["BPC-157", "LL-37", "Thymosin Alpha-1"],
    research:
      "Strong preclinical data for IBD and wound healing. Limited clinical human trials but growing research interest. Well-tolerated in animal studies.",
    caution:
      "Very limited long-term human data. Melanocortin receptor activation may cause mild tanning effect. Source purity is critical.",
  },
  {
    name: "LL-37",
    aliases: ["Cathelicidin", "CAMP peptide", "hCAP18/LL-37"],
    category: "Immune",
    summary:
      "The only member of the cathelicidin family of antimicrobial peptides in humans. A broad-spectrum antimicrobial and immunomodulatory peptide produced by epithelial cells and immune cells.",
    mechanism:
      "Disrupts bacterial cell membranes via charge-based interaction (effective against gram-positive and gram-negative bacteria). Modulates TLR-mediated innate immune responses, promotes wound healing, and has antiviral and antifungal activity.",
    benefits: [
      "Broad-spectrum antimicrobial activity",
      "Antiviral effects (including against influenza and HIV)",
      "Promotes wound healing and tissue repair",
      "Immunomodulation — reduces excessive inflammation",
      "Potential anti-cancer activity (selective cytotoxicity)",
    ],
    protocol:
      "100–300 mcg subcutaneous injection daily or every other day. Topical creams for skin conditions. Often cycled 4–6 weeks.",
    dosing: "100–300 mcg per injection",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~1–3 hours",
    sideEffects: [
      "Injection site irritation (can be significant)",
      "Temporary redness and swelling",
      "Rare systemic inflammatory response at high doses",
    ],
    synergies: ["KPV", "Thymosin Alpha-1", "BPC-157"],
    research:
      "Extensively studied in vitro and in animal models for infection, wound healing, and inflammation. Limited formal human clinical trials for peptide supplementation context.",
    caution:
      "Can cause notable injection site reactions. Use in cancer patients is complex — LL-37 can have both pro- and anti-tumor effects depending on cancer type. Do not use without professional oversight.",
  },
  {
    name: "Hexarelin",
    aliases: ["Examorelin", "Hex", "EP 23905"],
    category: "Hormonal",
    summary:
      "A potent synthetic hexapeptide GHRP (Growth Hormone Releasing Peptide) and the most powerful GH secretagogue by weight. Also has direct cardiac and anti-fibrotic effects.",
    mechanism:
      "Binds GHS-R1a receptors in the pituitary and hypothalamus, powerfully stimulating GH release. Uniquely also binds to CD36 receptors in cardiac tissue, providing cardioprotective effects independent of GH.",
    benefits: [
      "Strongest GH pulse of any GHRP",
      "Rapid lean mass accretion",
      "Direct cardioprotective effects",
      "Anti-fibrotic activity (liver, heart)",
      "Enhanced recovery and fat loss over time",
    ],
    protocol:
      "100–200 mcg subcutaneous injection 1–3× daily. Fasting preferred. Often cycled due to desensitization risk. Lower doses (100 mcg) preferred for long-term use.",
    dosing: "100–200 mcg per injection",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~70 minutes",
    sideEffects: [
      "Significant cortisol and prolactin elevation (more than Ipamorelin)",
      "Increased hunger",
      "Water retention",
      "Tingling or numbness",
      "Desensitization with continuous use",
    ],
    synergies: ["CJC-1295", "Ipamorelin", "IGF-1 LR3"],
    research:
      "Extensive research including human GH studies. Cardiac protective effects well-characterized in animal models. Less commonly used clinically due to side effect profile vs. Ipamorelin.",
    caution:
      "Elevates cortisol and prolactin — not ideal for individuals sensitive to these hormones. Rapid desensitization with overuse. Consider cycling with Ipamorelin.",
  },
  {
    name: "AOD-9604",
    aliases: ["Anti-Obesity Drug 9604", "hGH fragment 176-191", "AOD9604"],
    category: "Fat Loss",
    summary:
      "A modified fragment of human growth hormone (amino acids 176–191) specifically targeting fat metabolism without the growth-promoting or insulin-desensitizing effects of full GH.",
    mechanism:
      "Mimics the lipolytic (fat-burning) region of GH while avoiding the IGF-1–mediated anabolic region. Stimulates fat breakdown via β3-adrenergic receptors and inhibits lipogenesis (new fat formation).",
    benefits: [
      "Targeted fat burning without GH's anabolic effects",
      "Does not affect blood glucose or insulin sensitivity",
      "May regenerate cartilage (unexpected finding in trials)",
      "Reduces visceral and subcutaneous fat",
      "No suppression of natural GH axis",
    ],
    protocol:
      "250–500 mcg subcutaneous injection daily, ideally before cardio or in the morning. Best on an empty stomach.",
    dosing: "250–500 mcg per day",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~30–60 minutes",
    sideEffects: [
      "Mild injection site redness",
      "Headache (uncommon)",
      "Mild lethargy shortly post-injection",
    ],
    synergies: ["CJC-1295/Ipamorelin", "Retatrutide", "MOTS-c"],
    research:
      "FDA-approved as food ingredient (GRAS status). Phase 2 and 3 human obesity trials — effective for fat loss, not approved as drug. Cartilage regeneration findings from OA trials.",
    caution:
      "Not for use in individuals with active cancer — stimulates lipolysis pathways that may intersect with tumor metabolism. Avoid in pregnancy.",
  },
  {
    name: "IGF-1 LR3",
    aliases: [
      "Insulin-like Growth Factor 1 Long R3",
      "Long R3 IGF-1",
      "IGF-1-LR3",
    ],
    category: "Muscle & Performance",
    summary:
      "A longer-acting analogue of IGF-1 with reduced binding to IGF-binding proteins, resulting in dramatically extended activity in muscle tissue for growth and repair.",
    mechanism:
      "Binds IGF-1 receptors in muscle and satellite cells, promoting protein synthesis, hyperplasia (new muscle cell formation), and glycogen uptake. The LR3 modification reduces IGFBP binding, extending active half-life from 15 min to ~20 hours.",
    benefits: [
      "Muscle cell hyperplasia and hypertrophy",
      "Enhanced nitrogen retention and protein synthesis",
      "Improved muscle glycogen storage",
      "Accelerated recovery from intense training",
      "Potential joint and tendon support",
    ],
    protocol:
      "20–100 mcg intramuscular (local) or subcutaneous injection post-workout. 4–6 week cycles; avoid continuous use due to receptor downregulation.",
    dosing: "20–100 mcg per injection; 40–60 mcg typical",
    reconstitution: "1 mg vial + 1 mL 0.6% acetic acid = 1,000 mcg/mL (use acetic acid, not BAC water)",
    halfLife: "~20–30 hours",
    sideEffects: [
      "Hypoglycemia (significant risk — have glucose on hand)",
      "Joint pain (\"IGF joints\")",
      "Numbness in extremities",
      "Organ growth with long-term supraphysiological use",
      "Insulin resistance potential",
    ],
    synergies: ["PEG-MGF", "CJC-1295/Ipamorelin", "Hexarelin"],
    research:
      "Well-studied in anabolic and metabolic research. Used extensively in bodybuilding community; limited formal human trials for performance specifically.",
    caution:
      "Significant hypoglycemia risk — consume carbohydrates post-injection. Potential carcinogenic concern with long-term use — promotes cell growth non-selectively. Not for use with cancer history.",
  },
  {
    name: "PEG-MGF",
    aliases: [
      "PEGylated Mechano Growth Factor",
      "PEGylated MGF",
      "IGF-1Ec (PEG)",
    ],
    category: "Muscle & Performance",
    summary:
      "A PEGylated form of Mechano Growth Factor (MGF), a splice variant of IGF-1 expressed in response to muscle stretch and damage. PEGylation dramatically extends its half-life.",
    mechanism:
      "MGF activates dormant satellite (stem) cells in muscle tissue, stimulating them to proliferate and fuse with damaged muscle fibers. This results in muscle repair and potential hyperplasia. The Ec peptide domain is distinct from IGF-1's receptor-binding domain.",
    benefits: [
      "Activates muscle satellite cells for repair and growth",
      "Promotes muscle hyperplasia (new fiber formation)",
      "Accelerates recovery from muscle damage",
      "Complementary to IGF-1 LR3 in post-workout timing",
      "May preserve muscle during caloric restriction",
    ],
    protocol:
      "200–400 mcg subcutaneous or intramuscular injection 2–3× per week. Often used post-workout on the same days as training. 4–6 week cycles recommended.",
    dosing: "200–400 mcg per injection",
    reconstitution: "2 mg vial + 2 mL BAC water = 1,000 mcg/mL",
    halfLife: "~4–6 days (PEGylated form; non-PEG MGF has ~minutes half-life)",
    sideEffects: [
      "Possible mild hypoglycemia",
      "Injection site reactions",
      "Joint aching",
      "PEG polymer accumulation concerns with very long-term use",
    ],
    synergies: ["IGF-1 LR3", "CJC-1295/Ipamorelin", "BPC-157"],
    research:
      "MGF discovered in 1996; PEG-MGF developed to extend activity. Primarily preclinical research (in vitro and rodent models). Limited human trial data specifically for PEG-MGF.",
    caution:
      "Like IGF-1, promotes cell proliferation — avoid with cancer history. PEG component: potential immune response with very long-term use. Sourcing purity is critical.",
  },
];

// ─────────────────────────────────────────────
// Category Config
// ─────────────────────────────────────────────

const CATEGORIES = [
  "All",
  "Injury & Recovery",
  "Muscle & Performance",
  "Fat Loss",
  "Sleep & Recovery",
  "Cognitive",
  "Longevity",
  "Hormonal",
  "Immune",
] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

function getCategoryStyle(category: string): string {
  const styles: Record<string, string> = {
    "Injury & Recovery": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "Muscle & Performance": "bg-green-500/20 text-green-300 border-green-500/30",
    "Fat Loss": "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "Sleep & Recovery": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    Cognitive: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    Longevity: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Hormonal: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    Immune: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  };
  return styles[category] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30";
}

// ─────────────────────────────────────────────
// Suggested Chat Prompts
// ─────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What's the best protocol for BPC-157 and TB-500 combined?",
  "How does CJC-1295 work with Ipamorelin?",
  "What supplements stack well with NAD+?",
  "Explain GHK-Cu's mechanism of action",
  "What is a good peptide protocol for injury recovery?",
  "What are the differences between Semax and Selank?",
];

// ─────────────────────────────────────────────
// Peptide Detail Dialog
// ─────────────────────────────────────────────

function PeptideDetailDialog({
  peptide,
  open,
  onClose,
}: {
  peptide: PeptideInfo | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!peptide) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full bg-[#1a1a2e] border-white/10 text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                {peptide.name}
              </DialogTitle>
              {peptide.aliases.length > 0 && (
                <p className="text-sm text-white/50 mt-1">
                  {peptide.aliases.join(" · ")}
                </p>
              )}
            </div>
            <Badge
              className={cn(
                "border text-xs font-semibold mt-1 shrink-0",
                getCategoryStyle(peptide.category)
              )}
            >
              {peptide.category}
            </Badge>
          </div>
          <p className="text-white/70 text-sm mt-2">{peptide.summary}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left column */}
          <div className="space-y-5">
            <Section title="Mechanism of Action">
              <p className="text-white/70 text-sm leading-relaxed">
                {peptide.mechanism}
              </p>
            </Section>

            <Section title="Benefits">
              <ul className="space-y-1">
                {peptide.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-green-400 mt-0.5 shrink-0">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </Section>

            <InfoRow label="Protocol" value={peptide.protocol} />
            <InfoRow label="Dosing" value={peptide.dosing} />
            <InfoRow label="Reconstitution" value={peptide.reconstitution} />
            <InfoRow label="Half-Life" value={peptide.halfLife} />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <Section title="Side Effects">
              <ul className="space-y-1">
                {peptide.sideEffects.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Synergies">
              <div className="flex flex-wrap gap-2">
                {peptide.synergies.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs bg-white/10 text-white/80 rounded-md px-2 py-1 border border-white/10"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>

            <Section title="Research Status">
              <p className="text-white/70 text-sm leading-relaxed">
                {peptide.research}
              </p>
            </Section>

            <Section title="Safety Caution">
              <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <span className="text-orange-400 text-base mt-0.5">⚠</span>
                <p className="text-orange-300 text-sm leading-relaxed">
                  {peptide.caution}
                </p>
              </div>
            </Section>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-center text-xs text-white/40">
            For research purposes only. Consult a healthcare provider before starting any peptide protocol.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider text-white/40 block mb-1">
        {label}
      </span>
      <p className="text-sm text-white/80 leading-relaxed">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Peptide Library Tab
// ─────────────────────────────────────────────

function PeptideLibrary() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [selectedPeptide, setSelectedPeptide] = useState<PeptideInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = PEPTIDES.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function openDetail(peptide: PeptideInfo) {
    setSelectedPeptide(peptide);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          data-testid="peptide-search"
          placeholder="Search by name or alias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-green-500/50 focus:ring-green-500/20"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150",
              activeCategory === cat
                ? "bg-green-500/20 border-green-500/50 text-green-300"
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-white/40">
        {filtered.length} peptide{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No peptides match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((peptide) => (
            <Card
              key={peptide.name}
              className="bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8 transition-all duration-200 group flex flex-col"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base group-hover:text-green-300 transition-colors">
                    {peptide.name}
                  </h3>
                  <Badge
                    className={cn(
                      "border text-[10px] font-semibold shrink-0",
                      getCategoryStyle(peptide.category)
                    )}
                  >
                    {peptide.category}
                  </Badge>
                </div>
                {peptide.aliases.length > 0 && (
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                    {peptide.aliases.slice(0, 2).join(" · ")}
                    {peptide.aliases.length > 2 && " · ..."}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <p className="text-sm text-white/65 leading-relaxed line-clamp-3">
                  {peptide.summary}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetail(peptide)}
                  className="w-full border-white/15 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PeptideDetailDialog
        peptide={selectedPeptide}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// AI Chat Tab
// ─────────────────────────────────────────────

function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: Message = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMessage];

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "", streaming: true },
      ]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await authFetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === "assistant") {
                      next[next.length - 1] = {
                        ...last,
                        content: last.content + parsed.text,
                        streaming: true,
                      };
                    }
                    return next;
                  });
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content:
                  last.content ||
                  "Sorry, there was an error connecting to the AI. Please try again.",
                streaming: false,
              };
            }
            return next;
          });
        }
      } finally {
        setIsStreaming(false);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [messages, isStreaming]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    if (isStreaming) {
      abortRef.current?.abort();
    }
    setMessages([]);
    setInput("");
    setIsStreaming(false);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
      {/* Header disclaimer */}
      <div className="text-center py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
        <p className="text-xs text-amber-300/80">
          For research purposes only — not medical advice. Consult a healthcare provider before starting any protocol.
        </p>
      </div>

      {/* Message area */}
      <ScrollArea className="flex-1 pr-1">
        <div className="space-y-4 pb-4 px-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pt-8 pb-4 gap-6">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto text-green-400/60 mb-3" />
                <p className="text-white/60 text-sm">
                  Ask anything about peptides, protocols, and stacks.
                </p>
              </div>

              {/* Suggested prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="text-left text-sm text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg px-4 py-3 transition-all duration-150 leading-relaxed"
                  >
                    <MessageCircle className="h-3.5 w-3.5 inline-block mr-2 text-green-400/70" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "user"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-white/10 text-white/60"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-green-600/25 text-white border border-green-500/20 rounded-tr-sm"
                      : "bg-white/7 text-white/85 border border-white/10 rounded-tl-sm"
                  )}
                >
                  {msg.role === "assistant" && msg.streaming && !msg.content ? (
                    // Typing indicator
                    <span className="flex items-center gap-1.5 h-5">
                      <span
                        className="h-2 w-2 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 rounded-full bg-white/40 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  ) : (
                    <div className={cn("prose prose-sm max-w-none", msg.role === "user" ? "prose-invert" : "dark:prose-invert")}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.role === "assistant" && msg.streaming && msg.content && (
                    <span className="inline-block h-4 w-0.5 bg-green-400 ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="pt-3 border-t border-white/10 mt-2">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            data-testid="chat-input"
            placeholder="Ask about peptides, protocols, stacks..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-green-500/50 focus:ring-green-500/20 disabled:opacity-50"
          />

          {messages.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearChat}
              className="border-white/15 text-white/50 hover:text-white/80 hover:bg-white/10 shrink-0"
              title="Clear chat"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="bg-green-600 hover:bg-green-500 text-white shrink-0 disabled:opacity-40"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Research Page
// ─────────────────────────────────────────────

export default function Research() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Research</h1>
              <p className="text-sm text-white/50">
                Peptide library &amp; AI research assistant
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="library">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger
              value="library"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-white/60"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Peptide Library
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-white/60"
            >
              <Bot className="h-4 w-4 mr-2" />
              AI Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <PeptideLibrary />
          </TabsContent>

          <TabsContent value="chat">
            <ProGate featureName="AI Research Assistant" inline benefits={[
              "Chat with a peptide & supplement AI expert",
              "Research-backed answers with citations",
              "Personalized to your supplement stack",
              "Protocol optimization guidance",
            ]}>
              <AiChat />
            </ProGate>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
