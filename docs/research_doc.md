# Research Resources and Context

Extended documentation for the ParaTrace study, including expert consultations, policy context, and academic references.

---

## Expert Consultations

### Nicole Minutti -- Information and Privacy Commissioner of Ontario

Nicole clarified the IPC's AI-scribe guidance scope: it is intentionally centered on privacy, governance, PHIPA, consent, and appropriate handling of personal health information. Questions of clinical appropriateness, quality of care, and whether AI transformations preserve clinically useful information sit **outside that mandate**.

**Key takeaway:** Privacy compliance and clinical fidelity are separate regulatory problems. A system can be private, secure, consented to, and semantically accurate -- and still alter information that matters to a downstream use. This framing shaped ParaTrace's core contribution: identifying a failure mode that existing governance was not designed to catch.

Nicole also clarified that responsibility for signal-fidelity testing is distributed across organizations (Supply Ontario, professional/regulatory colleges, Health Canada, CMPA) with no single body owning it. This governance gap is part of what ParaTrace addresses.

### Christine Aiken -- Dementia Advocacy International

Christine provided patient-lived experience with dementia, serving on the DAI board and speaking at ADI and UN forums. Her perspective emphasized that the subtle speech characteristics ParaTrace measures -- hesitations, word-finding pauses, repetitions -- are not noise to be cleaned away. They are part of the patient's authentic voice and may carry clinical meaning.

This consultation informed the study's framing around the difference between readability optimization and information preservation.

---

## Policy Context

Ontario is deploying AI clinical scribes across its healthcare system (18 vendors approved by Supply Ontario, DAX Copilot piloting at The Ottawa Hospital) while Canada's National Dementia Strategy simultaneously prioritizes early detection through speech-based cognitive screening.

ParaTrace does **not** claim that AI scribes cause missed dementia diagnoses. What it demonstrates is that controlled LLM rewriting alters a defined linguistic feature representation and reduces performance of a classifier trained on the original distribution. The careful claim is about a potential downstream information-preservation failure, not demonstrated clinical harm.

**Open questions this study raises:**

- Whether vendors retain raw audio or raw ASR transcripts
- Whether rewritten notes are later reused for analytics or clinical ML
- What provenance hospitals retain between raw speech and the final note
- Whether any Ontario procurement benchmark measures linguistic-signal preservation
- Which regulator or procurement body would actually own that requirement

---

## Framing Evolution

The study's intellectual framing developed through the expert consultations:

**Before consultations:** LLM rewriting removes linguistic biomarkers; classifier performance falls.

**After consultations:** Healthcare AI governance strongly addresses privacy and data handling, but semantic preservation and privacy compliance do not necessarily guarantee preservation of clinically useful latent information. ParaTrace empirically measures that separate failure mode and raises the question of where signal-fidelity testing belongs in procurement, governance, and system architecture.

This reframing positions ParaTrace around a deeper systems question: **What does it actually mean for an AI transformation of clinical data to preserve the information in its input?**

---

## Scope and Limitations

This project evaluates whether controlled LLM rewriting alters a defined linguistic feature representation and whether those changes degrade a downstream cognitive-status classifier. It does **not**:

- Test whether AI scribes impair real-world clinical diagnosis
- Evaluate production AI-scribe systems (it uses general-purpose LLMs as proxies)
- Validate the proposed pre-extraction architecture as a deployed solution
- Claim that the DementiaBank Pitt Corpus is representative of modern clinical speech recording

The pre-extraction architecture remains a proposed mitigation. ParaTrace has validated the degradation phenomenon, not yet validated that architecture as the solution.

---

## References

- Becker, J.T., Boiler, F., Lopez, O.L., Saxton, J., & McGonigle, K.L. (1994). The natural history of Alzheimer's disease: Description of study cohort and accuracy of diagnosis. *Archives of Neurology*, 51(6), 585-594.
- Balabin, H., et al. (2025). Leveraging speech and NLP for cognitive decline detection. *Journal of Alzheimer's Disease*.
- Chou, H.C., et al. (2024). Linguistic biomarker classification from clinical speech transcripts. *INTERSPEECH*.
- Fraser, K.C., Meltzer, J.A., & Rudzicz, F. (2016). Linguistic features identify Alzheimer's disease in narrative speech. *Journal of Alzheimer's Disease*, 49(2), 407-422.

---

## Protocol

The complete pre-registered experimental protocol, frozen on August 18, 2026, is available in [`protocol.md`](protocol.md).