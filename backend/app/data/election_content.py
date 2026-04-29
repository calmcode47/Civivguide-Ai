from __future__ import annotations

from app.models.schemas import ElectionPhase, ElectionStep, OfficialResource

OFFICIAL_RESOURCES: dict[str, OfficialResource] = {
    "eci": OfficialResource(
        title="Election Commission of India",
        url="https://www.eci.gov.in/",
    ),
    "voters_portal": OfficialResource(
        title="Voters' Service Portal",
        url="https://voters.eci.gov.in/",
    ),
    "eci_results": OfficialResource(
        title="ECI Results Portal",
        url="https://results.eci.gov.in/",
    ),
}

PERSONA_HINTS: dict[str, str] = {
    "first-time voter": (
        "The user may need simple explanations, document checklists, and clarity on "
        "registration, voter slips, polling booths, and what happens on voting day."
    ),
    "returning voter": (
        "The user likely needs efficient procedural guidance, correction or transfer "
        "steps, and a quick reminder of official verification points."
    ),
    "candidate": (
        "The user needs neutral process information about nomination papers, affidavits, "
        "security deposits, scrutiny, campaign rules, and compliance."
    ),
    "observer": (
        "The user is looking for structured process explanations, oversight concepts, "
        "and how different election stages fit together."
    ),
    "general": (
        "The user needs practical, non-partisan election guidance in plain language."
    ),
}

INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "registration": (
        "register",
        "registration",
        "enrol",
        "enroll",
        "electoral roll",
        "voter list",
        "form 6",
        "form 8",
        "epic",
        "voter id",
        "name missing",
        "address change",
        "transfer vote",
    ),
    "timeline": (
        "timeline",
        "process",
        "schedule",
        "phase",
        "notification",
        "nomination",
        "scrutiny",
        "withdrawal",
        "campaign",
        "counting",
        "government formation",
    ),
    "polling": (
        "polling",
        "polling booth",
        "booth",
        "vote",
        "voting day",
        "evm",
        "vvpat",
        "slip",
        "identity card",
        "id proof",
        "polling station",
        "queue",
    ),
    "ballot": (
        "ballot",
        "nota",
        "symbol",
        "candidate list",
        "affidavit",
        "serial number",
        "constituency",
        "reserved symbol",
    ),
    "candidate": (
        "candidate",
        "contesting",
        "contest election",
        "nomination paper",
        "deposit",
        "affidavit",
        "campaign rules",
        "mcc",
        "model code",
    ),
    "results": (
        "result",
        "counting",
        "winner",
        "majority",
        "government",
        "certificate",
        "counting day",
    ),
}

INTENT_NOTES: dict[str, list[str]] = {
    "registration": [
        "Eligibility for enrolment in India generally requires citizenship, age 18 or above on the qualifying date, and ordinary residence in the constituency.",
        "Common voter service requests include new enrolment, correction of details, address transfer, and checking whether a name appears in the electoral roll.",
        "Users should verify their final status on the official Voters' Service Portal or through ECI channels rather than relying on unofficial screenshots.",
    ],
    "timeline": [
        "The core sequence usually runs from notification to nomination, scrutiny, withdrawal, campaigning, silence period, polling, counting, and result declaration.",
        "Exact dates vary by election, so the assistant must explain the process without inventing current deadlines.",
        "Model Code of Conduct applies once the election schedule is announced.",
    ],
    "polling": [
        "On polling day, the key user needs are booth location, accepted identity proof, queue process, EVM/VVPAT understanding, and what to do if details do not match.",
        "The assistant should remind users to verify booth details officially because local assignments can change.",
        "The assistant must stay neutral and procedural, never recommending a party or candidate.",
    ],
    "ballot": [
        "Users often need plain-language explanations of NOTA, constituency, candidate symbol, VVPAT, affidavit disclosure, and polling sequence.",
        "Ballot explanations should reduce jargon and explain why each term matters on voting day.",
    ],
    "candidate": [
        "Candidates need neutral process guidance on nomination papers, affidavits, scrutiny, withdrawal, campaign rules, expenditure compliance, and result certification.",
        "The assistant should avoid legal overstatement and direct users to official ECI guidance for binding procedural details.",
    ],
    "results": [
        "Results explanations should cover counting supervision, VVPAT verification, declaration of the winning candidate, and the next constitutional step.",
        "The assistant must never invent live leads or seat counts.",
    ],
    "general": [
        "The assistant should clarify the user's stage first, then explain the election process in numbered, easy-to-follow steps.",
        "When the question depends on official schedules or local constituency data, the answer should explicitly say that the user must confirm through ECI channels.",
    ],
}

SUGGESTIONS_BY_PERSONA: dict[str, dict[str, list[str]]] = {
    "general": {
        "general": [
            "How does the full election process work from announcement to results?",
            "What documents should I carry on polling day?",
            "What is the difference between EVM and VVPAT?",
            "Where should I verify official election updates?",
        ],
        "registration": [
            "How do I check whether my name is on the voter list?",
            "When should I use Form 6 or Form 8?",
            "What should I do if my address has changed?",
            "What if my voter ID details are incorrect?",
        ],
        "timeline": [
            "What happens after the election schedule is announced?",
            "What is the scrutiny stage in elections?",
            "Why is there a 48-hour silence period?",
            "What happens between counting and government formation?",
        ],
        "polling": [
            "What happens at the polling booth step by step?",
            "Which ID proofs are usually accepted for voting?",
            "What if I cannot find my booth at the last minute?",
            "How does VVPAT confirmation work?",
        ],
        "ballot": [
            "What does NOTA mean on the ballot?",
            "What is a candidate symbol and why does it matter?",
            "What is an election affidavit?",
            "What is a constituency in simple words?",
        ],
        "candidate": [
            "What documents are needed for nomination?",
            "What happens during scrutiny of nominations?",
            "How does the Model Code of Conduct affect campaigns?",
            "What should a candidate verify before polling day?",
        ],
        "results": [
            "How are votes counted in India?",
            "What is the role of VVPAT during counting?",
            "When is the winning certificate issued?",
            "How is the government formed after results?",
        ],
    },
    "first-time voter": {
        "general": [
            "I am voting for the first time. What should I do first?",
            "How do I check if I am registered to vote?",
            "What happens at the polling booth?",
            "What should I carry on voting day?",
        ],
    },
    "returning voter": {
        "general": [
            "How do I transfer my voter registration after moving?",
            "What should I do if my details need correction?",
            "How can I verify my polling booth quickly?",
            "What has changed after the election schedule is announced?",
        ],
    },
    "candidate": {
        "general": [
            "What is the nomination and scrutiny process for candidates?",
            "What disclosures are usually required in candidate affidavits?",
            "What does the Model Code of Conduct restrict?",
            "What should a candidate prepare before counting day?",
        ],
    },
    "observer": {
        "general": [
            "Explain the full election workflow in a structured way.",
            "What are the most important compliance checkpoints in an election?",
            "How do polling, counting, and result declaration connect?",
            "What are the most important official election sources to track?",
        ],
    },
}

TIMELINE_PHASES: list[ElectionPhase] = [
    ElectionPhase(
        id="pre-poll",
        name="Pre-Election",
        color="#d4a017",
        steps=[
            ElectionStep(
                id="schedule-announcement",
                phase="Pre-Election",
                title="Election Schedule Announced",
                description=(
                    "The Election Commission announces the schedule and the Model "
                    "Code of Conduct begins to apply."
                ),
                duration="Day 0",
                order=1,
                details=[
                    "Press note and phase-wise schedule are issued by ECI.",
                    "Campaign and government conduct immediately become subject to MCC.",
                    "Key dates such as notification, polling, and counting are published.",
                ],
            ),
            ElectionStep(
                id="electoral-roll",
                phase="Pre-Election",
                title="Electoral Roll Verification",
                description=(
                    "Voters verify enrolment details and resolve missing names, "
                    "corrections, or address transfers."
                ),
                duration="Ongoing before poll",
                order=2,
                details=[
                    "Eligible citizens check their names on the electoral roll.",
                    "New enrolment or correction requests are submitted through official channels.",
                    "Final rolls are used to prepare polling station records.",
                ],
            ),
            ElectionStep(
                id="notification",
                phase="Pre-Election",
                title="Formal Notification Issued",
                description=(
                    "The formal notification opens the window for candidates to file nominations."
                ),
                duration="1 day",
                order=3,
                details=[
                    "Notification is issued for the relevant constituency or phase.",
                    "Returning Officers begin accepting nomination papers.",
                    "Candidates confirm required documents, affidavits, and deposits.",
                ],
            ),
            ElectionStep(
                id="nomination-scrutiny",
                phase="Pre-Election",
                title="Nomination, Scrutiny, and Withdrawal",
                description=(
                    "Candidates file papers, officers scrutinize them, and the final "
                    "list of contesting candidates is prepared."
                ),
                duration="Several days",
                order=4,
                details=[
                    "Nomination papers are submitted before the deadline.",
                    "Scrutiny checks whether papers and documents are valid.",
                    "Candidates may withdraw within the permitted withdrawal window.",
                ],
            ),
        ],
    ),
    ElectionPhase(
        id="campaign",
        name="Campaign",
        color="#3b82f6",
        steps=[
            ElectionStep(
                id="campaign-period",
                phase="Campaign",
                title="Campaigning and Voter Outreach",
                description=(
                    "Parties and candidates campaign within the limits set by election law and MCC."
                ),
                duration="Varies by schedule",
                order=5,
                details=[
                    "Campaigns include rallies, door-to-door outreach, and public messaging.",
                    "Spending, speeches, and publicity remain subject to compliance rules.",
                    "Election authorities monitor violations and complaints.",
                ],
            ),
            ElectionStep(
                id="silence-period",
                phase="Campaign",
                title="Silence Period",
                description=(
                    "Public campaigning stops 48 hours before the end of polling in a constituency."
                ),
                duration="48 hours",
                order=6,
                details=[
                    "Public meetings and high-visibility campaigning stop.",
                    "The focus shifts to lawful booth-level preparation and logistics.",
                    "Voters should use the time to verify documents and booth information.",
                ],
            ),
        ],
    ),
    ElectionPhase(
        id="polling",
        name="Polling",
        color="#10b981",
        steps=[
            ElectionStep(
                id="polling-day",
                phase="Polling",
                title="Polling Day",
                description=(
                    "Registered voters go to their assigned booths, verify identity, and vote using the EVM."
                ),
                duration="1 day",
                order=7,
                details=[
                    "The voter verifies booth details and joins the queue.",
                    "Identity is checked and the vote is cast on the EVM.",
                    "The voter can confirm the symbol on the VVPAT display momentarily.",
                ],
            ),
        ],
    ),
    ElectionPhase(
        id="post-poll",
        name="Post-Poll",
        color="#ef4444",
        steps=[
            ElectionStep(
                id="counting-results",
                phase="Post-Poll",
                title="Counting and Result Declaration",
                description=(
                    "Votes are counted under supervision and winners are declared constituency by constituency."
                ),
                duration="1 day",
                order=8,
                details=[
                    "Counting begins under the Returning Officer's supervision.",
                    "Required VVPAT verification steps are followed.",
                    "The winning candidate is declared and certified.",
                ],
            ),
            ElectionStep(
                id="government-formation",
                phase="Post-Poll",
                title="Government Formation",
                description=(
                    "After results, constitutional processes determine who is invited to form the government."
                ),
                duration="Several days",
                order=9,
                details=[
                    "The majority party or coalition chooses its leader.",
                    "The constitutional authority invites the leader to form the government.",
                    "The ministry is sworn in after the formal process is complete.",
                ],
            ),
        ],
    ),
]
