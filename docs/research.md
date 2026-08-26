# Research Resources and Context

Extended research documentation for **ParaTrace**, including related academic work, policy context, expert consultations, interpretation of the results, and the boundaries of the study's claims.

ParaTrace studies a specific information-preservation problem:

> **Can an LLM preserve what a patient says while altering the measurable structure of how they said it?**

The project evaluates whether progressively stronger language-model rewriting changes cognitive-linguistic features extracted from spontaneous speech and whether those changes reduce the performance of a downstream cognitive-status classifier trained on the original speech distribution.

---

## 1. Research Context

Spontaneous speech contains information beyond literal semantic content.

Previous work in computational cognitive assessment has associated characteristics such as lexical diversity, repetition, syntactic complexity, semantic coherence, word-finding difficulty, and disfluency with cognitive status.

At the same time, modern language models are increasingly used to transform spontaneous speech into polished prose.

These two developments create an information-preservation question:

```text
Spontaneous speech
        |
        | contains
        v
Meaning + linguistic structure
        |
        | LLM rewriting
        v
Polished text
        |
        +--> Meaning may remain similar
        |
        +--> Linguistic structure may change
```

ParaTrace tests whether semantic preservation is sufficient to preserve the feature representation required by a downstream classifier.

---

## 2. Direct Prior Work

### Farzana, Deshpande & Parde (2022)

**How You Say It Matters: Measuring the Impact of Verbal Disfluency Tags on Automated Dementia Detection**

This is one of the closest predecessors to ParaTrace.

Farzana et al. studied whether verbal disfluencies contribute useful information to automated dementia detection. They experimentally removed disfluency information and measured the resulting classifier performance.

Removing gold-standard disfluency information reduced dementia-classification accuracy by up to **5.6 percentage points**.

This establishes an important precedent:

> Speech characteristics commonly treated as transcription noise can contain predictive cognitive information.

ParaTrace extends that question beyond targeted disfluency removal.

Instead of removing a single category of speech behavior, ParaTrace measures the effect of progressively stronger **LLM-mediated rewriting**, which can simultaneously alter:

* repetitions
* fillers
* lexical choice
* sentence structure
* syntactic complexity
* discourse organization
* semantic coherence
* information density

**Reference:**
Farzana, S., Deshpande, S., & Parde, N. (2022). *How You Say It Matters: Measuring the Impact of Verbal Disfluency Tags on Automated Dementia Detection*. BioNLP 2022.

---

## 3. Linguistic Biomarkers and Cognitive Status

### Fraser, Meltzer & Rudzicz (2016)

Fraser et al. demonstrated that automatically extracted linguistic variables from narrative speech can distinguish Alzheimer's disease from healthy control speech.

Their work examined features spanning several dimensions, including lexical, syntactic, semantic, and acoustic properties.

This work provides part of the methodological foundation for using structured linguistic representations in computational cognitive assessment.

**Reference:**
Fraser, K. C., Meltzer, J. A., & Rudzicz, F. (2016). Linguistic features identify Alzheimer's disease in narrative speech. *Journal of Alzheimer's Disease, 49*(2), 407–422.

### Chou et al. (2024)

Chou et al. investigated linguistic characteristics associated with early Alzheimer's disease, including lexical diversity, syntactic complexity, and disfluency-related measures.

The study further supports the idea that measurable properties of spontaneous speech can provide information relevant to cognitive assessment.

**Reference:**
Chou, H. C., et al. (2024). Screening for early Alzheimer's disease: enhancing diagnosis with linguistic features and biomarkers. *Frontiers in Aging Neuroscience, 16*, 1451326.

### ADReSS Challenge

The Alzheimer's Dementia Recognition through Spontaneous Speech challenge established a standardized benchmark for dementia classification using spontaneous picture-description speech derived from DementiaBank.

ADReSS is particularly relevant because it demonstrates the established use of spontaneous speech as a computational dementia-classification task while introducing controls intended to reduce common dataset biases.

**Reference:**
Luz, S., Haider, F., de la Fuente, S., Fromm, D., & MacWhinney, B. (2020). Alzheimer's Dementia Recognition through Spontaneous Speech: The ADReSS Challenge. *INTERSPEECH 2020*.

---

## 4. Emerging Evidence Around Automated Speech Processing

Recent cognitive-speech systems increasingly recognize that conventional transcription optimization can conflict with downstream cognitive analysis.

Some modern pipelines intentionally preserve:

* fillers
* repetitions
* fragmented words
* hesitation patterns
* other disfluency information

rather than automatically normalizing them.

This supports a broader design principle relevant to ParaTrace:

> **Transcription quality and downstream information preservation are not necessarily the same optimization objective.**

An ASR or rewriting system can produce more readable text without necessarily producing a better representation for every downstream task.

ParaTrace extends this concern from transcription behavior to generative rewriting.

---

## 5. ParaTrace Research Gap

Prior work establishes several pieces of the problem:

1. Linguistic characteristics of spontaneous speech can contribute to cognitive-status classification.
2. Disfluency information can contain predictive signal.
3. Removing selected speech characteristics can reduce dementia-classification performance.
4. Cognitive-speech systems may therefore need to preserve information that conventional text-cleaning systems would normally remove.

ParaTrace investigates a different transformation regime:

> **Progressive rewriting of the same clinically labeled transcript using contemporary LLMs.**

The study combines:

* the same source transcripts across conditions
* four progressive rewrite levels
* two LLM providers
* twenty linguistic features
* feature-level statistical testing
* semantic-similarity measurement
* a fixed downstream cognitive-status classification task

We have not identified prior work that reproduces this complete experimental design.

The appropriate novelty claim is therefore **not** that no previous study has examined information loss in cleaned dementia transcripts.

Instead:

> **ParaTrace extends prior evidence on targeted speech-signal removal to progressive, semantic-preserving LLM rewriting across a broader cognitive-linguistic feature representation.**

---

## 6. Experimental Evidence

ParaTrace evaluates:

| Component                      |                    Value |
| ------------------------------ | -----------------------: |
| Clinically labeled transcripts |                  **552** |
| Control transcripts            |                  **243** |
| Dementia transcripts           |                  **309** |
| LLM providers                  |                    **2** |
| Rewrite levels per provider    |                    **4** |
| Generated rewrites             |                **4,416** |
| Linguistic features            |                   **20** |
| Feature categories             |                    **8** |
| Evaluation                     | **Stratified 5-fold CV** |

### Classification degradation

| Level | Anthropic | OpenAI |   Average |
| ----- | --------: | -----: | --------: |
| L0    |     73.4% |  73.4% | **73.4%** |
| L1    |     68.8% |  66.5% | **67.7%** |
| L2    |     62.3% |  56.9% | **59.6%** |
| L3    |     51.8% |  52.5% | **52.2%** |
| L4    |     54.2% |  53.3% | **53.8%** |

The strongest observed drop is from **73.4% at baseline to 52.2% at L3**, a decline of **21.2 percentage points**.

L4 exhibits a small rebound to 53.8%, meaning the relationship is **not strictly monotonic**.

The defensible conclusion is therefore that progressively stronger rewriting produces substantial downstream degradation, rather than that every additional rewrite operation necessarily decreases accuracy.

### Feature-level drift

By L2:

* **19 of 20 features** were significantly altered under the Anthropic condition.
* **20 of 20 features** were significantly altered under the OpenAI condition.

Testing used paired Wilcoxon signed-rank tests with Benjamini-Hochberg false-discovery-rate correction.

### Semantic preservation

Semantic-similarity analysis showed that rewritten text can remain highly similar in meaning even while its linguistic representation and downstream predictive utility change substantially.

This produces the central ParaTrace distinction:

```text
Semantic fidelity
        !=
Linguistic feature fidelity
        !=
Downstream predictive fidelity
```

---

## 7. Expert Consultations

### Nicole Minutti

**Senior Health Policy Advisor, Office of the Information and Privacy Commissioner of Ontario**

Discussion with Nicole provided important context for interpreting ParaTrace within Ontario's healthcare AI governance environment.

The IPC's AI-scribe guidance is intentionally centered on matters within the IPC's mandate, including:

* privacy
* consent
* governance
* accountability
* protection of personal health information
* vendor and system assessment
* contractual safeguards
* ongoing monitoring

Questions such as clinical appropriateness, quality of care, medical liability, and broader clinical outcomes involve other components of the healthcare and regulatory ecosystem.

This distinction substantially changed the framing of ParaTrace.

### Key takeaway

**Privacy compliance and clinical information fidelity are separate questions.**

A system may satisfy privacy and security requirements while still altering information that could be important for another downstream use.

ParaTrace therefore does not present linguistic-signal degradation as solely an IPC or privacy problem.

Instead, the project raises a broader question spanning:

* AI system evaluation
* procurement
* clinical governance
* professional regulation
* model validation
* system architecture

Nicole's perspective helped clarify why ParaTrace should be framed as measuring an **information-preservation failure mode**, rather than as a criticism of existing privacy guidance.

---

### Christine Aiken

**Dementia advocate, Dementia Alliance International**

Christine contributed a lived-experience perspective on dementia and communication.

Her perspective reinforced the importance of distinguishing between speech characteristics that appear unnecessary from a documentation perspective and characteristics that form part of a patient's original expression.

Hesitations, repetitions, pauses, and word-finding behavior may appear to be imperfections when text is optimized for readability.

Within cognitive assessment, however, those same characteristics may carry information.

This consultation informed ParaTrace's distinction between:

> **readability optimization**

and

> **information preservation**

It also helped keep the study centered on preserving the integrity of the original patient's expression rather than treating every irregular speech characteristic as noise.

---

## 8. Ontario AI-Scribe Policy Context

### IPC Ontario

In January 2026, the Information and Privacy Commissioner of Ontario released:

**AI Scribes: Key Considerations for the Health Sector**

The guidance addresses responsible AI-scribe adoption from a privacy and governance perspective.

Importantly, the guidance distinguishes its mandate from broader questions including clinical appropriateness and quality-of-care considerations.

This boundary is important to ParaTrace because the project's central failure mode can occur even when a system remains semantically useful and privacy compliant.

### Supply Ontario

Supply Ontario has established an **AI Scribe Vendor of Record** procurement arrangement for Ontario healthcare organizations.

The procurement framework evaluates capabilities including areas such as:

* transcription
* note generation
* privacy
* security
* system functionality
* implementation requirements

ParaTrace raises an additional evaluation question:

> Should systems that transform spontaneous clinical speech also be evaluated for preservation of information relevant to downstream analytical uses?

The public procurement materials should not be interpreted as evidence that vendors do or do not perform such testing internally.

Rather, signal preservation is an additional technical evaluation dimension suggested by the ParaTrace results.

### The Ottawa Hospital

The Ottawa Hospital began testing ambient generative-AI documentation technology in 2024 and has subsequently moved to Microsoft Dragon Copilot.

The system converts clinician-patient conversations into draft clinical documentation for clinician review.

This provides a concrete example of the broader transition from ambient conversation to machine-generated structured documentation that motivates the ParaTrace research question.

---

## 9. National Dementia Context

Canada's National Dementia Strategy emphasizes improved dementia awareness, diagnosis, treatment, and quality of life.

The strategy supports the importance of timely diagnosis.

It should **not**, however, be described as specifically prioritizing speech-based cognitive screening.

Speech-based computational assessment is a separate research direction supported by the academic literature discussed above.

ParaTrace connects these areas at the level of information preservation rather than claiming that speech-based screening is itself a national policy requirement.

---

## 10. The Governance Gap

One of the most important insights arising from the policy analysis is that several different questions can apply to the same AI system:

```text
Is patient information handled legally and securely?
                    |
                 PRIVACY

Does the generated note accurately capture its intended content?
                    |
                QUALITY

Is the system appropriate for the intended clinical use?
                    |
          CLINICAL VALIDATION

Does transformation preserve information needed
for other downstream computational uses?
                    |
         INFORMATION FIDELITY
```

These questions overlap, but they are not equivalent.

ParaTrace focuses primarily on the fourth.

The study therefore raises a governance question rather than answering it:

> **Who should evaluate preservation of latent clinical or analytical information when AI systems transform healthcare data?**

---

## 11. Open Questions

ParaTrace raises several questions that remain outside the current experiment:

* Do production AI-scribe vendors retain raw audio or raw ASR transcripts?
* At what stage is the original speech representation deleted, if at all?
* Are generated clinical notes subsequently reused for analytics or clinical machine learning?
* What provenance is maintained between source conversation, transcript, and final note?
* Do procurement evaluations measure preservation of downstream analytical signals?
* Should certain information be extracted before generative transformation?
* Which healthcare, procurement, professional, or regulatory organization is best positioned to establish such requirements?
* How should preservation requirements interact with privacy principles such as data minimization?
* Which linguistic features, if any, are sufficiently clinically validated to justify prospective preservation?

These are research and governance questions, not claims established by ParaTrace.

---

## 12. Proposed Pre-Extraction Architecture

ParaTrace proposes separating linguistic-signal extraction from documentation generation.

```text
Patient speech
      |
      v
Raw ASR transcript
      |
      +------> Linguistic feature extraction
      |                   |
      |                   v
      |          Preserved feature representation
      |
      v
LLM documentation system
      |
      v
Polished clinical note
```

The proposal follows a simple architectural principle:

> **If information may be destroyed by a transformation, extract or preserve the required representation before the transformation occurs.**

This architecture remains a **proposed mitigation**.

The current study demonstrates degradation of the downstream representation. It does not establish that deployment of this architecture improves clinical outcomes.

---

## 13. Scope and Limitations

ParaTrace does **not**:

* demonstrate that commercial AI scribes cause missed dementia diagnoses
* evaluate a production AI-scribe vendor
* establish clinical safety or effectiveness
* establish that cognitive screening should operate on clinical notes
* establish that all twenty features are independently validated clinical biomarkers
* demonstrate that two model providers represent all LLM architectures
* establish that semantic similarity guarantees clinical equivalence
* establish that the DementiaBank Pitt Corpus represents modern ambient clinical conversations
* prospectively validate the proposed pre-extraction architecture

The experiment evaluates a narrower claim:

> **Controlled LLM rewriting can alter a defined cognitive-linguistic feature representation and reduce the performance of a classifier trained on the original speech distribution.**

---

## 14. Policy Resources

### Information and Privacy Commissioner of Ontario

* **AI Scribes: Key Considerations for the Health Sector**
* **AI Scribes: Checklist of Key Considerations for the Health Sector**
* **Principles for the Responsible Use of Artificial Intelligence**

IPC Ontario:
`https://www.ipc.on.ca/`

### Supply Ontario

* **Artificial Intelligence Solutions: AI Scribe Vendor of Record**

Supply Ontario:
`https://www.supplyontario.ca/vor/software/tender-20123-artificial-intelligent-solutions-ai-scribe/`

### College of Physicians and Surgeons of Ontario

* **Using Artificial Intelligence in Clinical Practice**

CPSO:
`https://www.cpso.on.ca/`

### Canadian Medical Protective Association

* Guidance and FAQs concerning AI scribes and physician responsibility

CMPA:
`https://www.cmpa-acpm.ca/`

### Health Canada

* Guidance for machine-learning-enabled medical devices and clinical validation where systems fall within the applicable medical-device framework

Health Canada:
`https://www.canada.ca/en/health-canada.html`

---

## 15. Dataset Resources

### DementiaBank Pitt Corpus

The Pitt Corpus is distributed through DementiaBank / TalkBank and is access-controlled.

Official corpus documentation:

`https://talkbank.org/dementia/access/English/Pitt.html`

Raw participant transcripts are not distributed through the ParaTrace repository.

---

## 16. Academic References

1. **Becker, J. T., Boller, F., Lopez, O. L., Saxton, J., & McGonigle, K. L. (1994).**
   The natural history of Alzheimer's disease: Description of study cohort and accuracy of diagnosis. *Archives of Neurology, 51*(6), 585–594.

2. **Fraser, K. C., Meltzer, J. A., & Rudzicz, F. (2016).**
   Linguistic features identify Alzheimer's disease in narrative speech. *Journal of Alzheimer's Disease, 49*(2), 407–422.

3. **Luz, S., Haider, F., de la Fuente, S., Fromm, D., & MacWhinney, B. (2020).**
   Alzheimer's Dementia Recognition through Spontaneous Speech: The ADReSS Challenge. *INTERSPEECH 2020*.

4. **Farzana, S., Deshpande, S., & Parde, N. (2022).**
   How You Say It Matters: Measuring the Impact of Verbal Disfluency Tags on Automated Dementia Detection. *BioNLP 2022*.

5. **Chou, H. C., et al. (2024).**
   Screening for early Alzheimer's disease: enhancing diagnosis with linguistic features and biomarkers. *Frontiers in Aging Neuroscience, 16*, 1451326.

---

## 17. Protocol

The complete experimental protocol was frozen on **August 18, 2026**, before final model evaluation.

See:

[`protocol.md`](protocol.md)

The protocol preserves the original hypotheses, variables, statistical procedures, and decision criteria independently of the final observed results.

---

## 18. Central Research Contribution

The central ParaTrace finding is not that AI rewriting necessarily destroys clinical meaning.

It is that **meaning preservation is only one definition of information preservation**.

For systems operating on clinically meaningful language:

> **A transformation can remain semantically faithful while becoming statistically incompatible with a downstream model trained on the original representation.**

That distinction motivates both the empirical study and the broader systems question behind ParaTrace:

> **What should an AI transformation be required to preserve?**
