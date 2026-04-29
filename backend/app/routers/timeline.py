from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import TimelineEvent

router = APIRouter(prefix="/api", tags=["timeline"])


@router.get("/timeline", response_model=list[TimelineEvent])
async def get_timeline() -> list[TimelineEvent]:
    """
    Static election process timeline for CivicMind.
    """
    return [
        TimelineEvent(
            id="announcement",
            icon="📢",
            title="Election Announcement & Model Code of Conduct",
            description=(
                "The Election Commission of India announces the election schedule and key dates. "
                "From this moment, the Model Code of Conduct (MCC) comes into force and applies to governments, parties, and candidates. "
                "All official actions and campaign activities must now strictly follow ECI rules to ensure a level playing field."
            ),
            phase="Pre-Election",
            order=1,
            typical_duration_days=10,
        ),
        TimelineEvent(
            id="voter-list",
            icon="📋",
            title="Voter List Finalization",
            description=(
                "Electoral rolls are updated to include new voters and correct existing entries. "
                "Citizens can use Forms 6, 6A, 6B, 6C, and 8 (as applicable) to apply for inclusion, overseas registration, corrections, or shifting of entries. "
                "Booth Level Officers and election officials verify applications before the final voter list is published."
            ),
            phase="Pre-Election",
            order=2,
            typical_duration_days=20,
        ),
        TimelineEvent(
            id="nomination",
            icon="📝",
            title="Candidate Nomination",
            description=(
                "Prospective candidates file nomination papers with the Returning Officer for their constituency. "
                "They must submit required forms, affidavits on criminal cases and assets, and party authorization if contesting on a party symbol. "
                "Nominations must be filed within the window announced in the election schedule."
            ),
            phase="Pre-Election",
            order=3,
            typical_duration_days=7,
        ),
        TimelineEvent(
            id="scrutiny",
            icon="🔍",
            title="Scrutiny & Withdrawal of Candidature",
            description=(
                "The Returning Officer scrutinizes all nomination papers for completeness and legal compliance. "
                "Invalid nominations are rejected after giving candidates an opportunity to be heard. "
                "A short window is then provided where validly nominated candidates may withdraw their candidature if they choose."
            ),
            phase="Pre-Election",
            order=4,
            typical_duration_days=3,
        ),
        TimelineEvent(
            id="campaign",
            icon="📣",
            title="Election Campaign",
            description=(
                "Approved candidates and political parties reach out to voters through rallies, door-to-door campaigns, and media. "
                "All campaign activities must follow the Model Code of Conduct, expenditure limits, and ECI guidelines on advertising and hate speech. "
                "Campaigning usually intensifies closer to polling day but must stop during the official silence period before voting."
            ),
            phase="Campaign",
            order=5,
            typical_duration_days=20,
        ),
        TimelineEvent(
            id="voting",
            icon="🗳️",
            title="Voting Day & EVM/VVPAT",
            description=(
                "On polling day, registered voters cast their votes at designated polling stations using EVMs (Electronic Voting Machines). "
                "VVPAT (Voter Verifiable Paper Audit Trail) units allow voters to visually confirm their chosen candidate on a paper slip before it drops into a sealed box. "
                "Strict security, identification, and secrecy-of-ballot procedures are followed throughout the polling process."
            ),
            phase="Polling",
            order=6,
            typical_duration_days=1,
        ),
        TimelineEvent(
            id="counting",
            icon="📊",
            title="Vote Counting & Results",
            description=(
                "On the designated counting day, sealed EVMs and VVPAT slips are opened in secure counting centres. "
                "Votes are tallied under the supervision of Returning Officers and in the presence of candidate agents. "
                "After counting and mandatory VVPAT checks as per ECI norms, results are declared constituency-wise."
            ),
            phase="Post-Poll",
            order=7,
            typical_duration_days=1,
        ),
        TimelineEvent(
            id="formation",
            icon="🏛️",
            title="Government Formation",
            description=(
                "Based on the final seat tally, the party or coalition with a majority stake is invited to form the government. "
                "Leaders elect or nominate their chief representative (Prime Minister or Chief Minister, as applicable) to head the government. "
                "The new council of ministers is sworn in, and the legislative body begins its term under constitutional procedures."
            ),
            phase="Post-Poll",
            order=8,
            typical_duration_days=15,
        ),
    ]


