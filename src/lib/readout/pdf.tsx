import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Stats } from "./stats";
import type { Synthesis, Theme } from "./synthesize";
import { GOOD } from "@/lib/starters/value-starter-framework";

const NAVY = "#0f1f3d";
const GOLD = "#c9a96e";
const GOLD_DARK = "#8a6a2e";
const CREAM = "#faf6ee";
const GRAY = "#555555";

const st = StyleSheet.create({
  page: { padding: 44, fontSize: 10.5, fontFamily: "Helvetica", color: "#1a1a1a", lineHeight: 1.45 },
  eyebrow: { fontSize: 8.5, color: GOLD_DARK, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 24, color: NAVY, fontFamily: "Helvetica-Bold", marginTop: 4, lineHeight: 1.2 },
  meta: { color: GRAY, marginTop: 4 },
  headline: { fontSize: 13, color: NAVY, marginTop: 12, paddingBottom: 12, borderBottom: `3pt solid ${GOLD}` },
  h2: { fontSize: 14, color: NAVY, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  h3: { fontSize: 11, color: NAVY, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  muted: { color: GRAY },
  card: { border: "1pt solid #e3e3e3", borderRadius: 4, padding: 8, marginBottom: 6 },
  good: { backgroundColor: CREAM, borderLeft: `3pt solid ${GOLD}`, padding: 8, marginTop: 6 },
  goodLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: GOLD_DARK, letterSpacing: 0.6 },
  compareLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.6, marginTop: 5 },
  statement: { backgroundColor: CREAM, padding: 10, fontSize: 12, color: NAVY },
  stats: { flexDirection: "row", gap: 8, marginTop: 4 },
  stat: { flex: 1, border: "1pt solid #e3e3e3", borderRadius: 4, padding: 8, alignItems: "center" },
  statN: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.2, marginBottom: 2 },
  barBg: { height: 6, backgroundColor: "#eef1f6", borderRadius: 3, marginBottom: 6 },
  bar: { height: 6, backgroundColor: NAVY, borderRadius: 3 },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 8, color: "#888888", flexDirection: "row", justifyContent: "space-between" },
});

function Themes({ items, total }: { items?: Theme[]; total: number }) {
  if (!items?.length) return <Text style={st.muted}>Not enough answers to find a theme.</Text>;
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={st.row} wrap={false}>
          <Text style={{ flex: 1, paddingRight: 8 }}>{t.theme}</Text>
          <Text style={st.muted}>
            {t.mentions} of {total}
            {t.ranked_first ? `, ${t.ranked_first} first` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Good({ good, compare }: { good: string; compare?: string }) {
  return (
    <View style={st.good} wrap={false}>
      <Text style={st.goodLabel}>WHAT GOOD LOOKS LIKE</Text>
      <Text>{good}</Text>
      {compare ? (
        <>
          <Text style={st.compareLabel}>HOW YOU COMPARE</Text>
          <Text>{compare}</Text>
        </>
      ) : null}
    </View>
  );
}

const TOPIC: Record<string, string> = {
  Customers: "Who our customers are",
  Value: "The value we create",
  Numbers: "The measures",
};

export function ReadoutPdf({
  teamName,
  template,
  stats,
  synthesis: s,
  createdAt,
}: {
  teamName: string;
  template: string;
  stats: Stats;
  synthesis: Synthesis;
  createdAt: string;
}) {
  const score = stats.scales?.[0];
  const fc = s.framework_check ?? {};
  return (
    <Document title={`${teamName} readout`} author="Team Starters by Stratechi">
      <Page size="LETTER" style={st.page}>
        <Text style={st.eyebrow}>{template} readout</Text>
        <Text style={st.title}>{teamName}</Text>
        <Text style={st.meta}>
          {stats.teamCount} team members{stats.leaderCount ? " and the leader" : ""} answered. {createdAt.slice(0, 10)}
        </Text>
        <Text style={st.headline}>{s.headline}</Text>

        <Text style={st.h2} minPresenceAhead={80}>Where the team lines up</Text>
        {s.alignment.map((a) => (
          <View key={a.topic} style={st.card}>
            <View style={st.row}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY }}>{TOPIC[a.topic] ?? a.topic}</Text>
              <Text style={st.muted}>{a.agreement} agreement</Text>
            </View>
            <Themes items={a.team_themes} total={stats.teamCount} />
            {a.leader_view ? <Text style={{ marginTop: 4 }}>Leader&apos;s view: {a.leader_view}</Text> : null}
            {a.gap ? <Text style={{ marginTop: 2 }}>Gap: {a.gap}</Text> : null}
            {a.topic === "Customers" ? <Good good={GOOD.customers} compare={fc.customers} /> : null}
            {a.topic === "Value" ? <Good good={GOOD.value} compare={fc.value} /> : null}
          </View>
        ))}

        {score ? (
          <View>
            <Text style={st.h2} minPresenceAhead={80}>How they&apos;d score our value</Text>
            <View style={st.stats} wrap={false}>
              <View style={st.stat}>
                <Text style={st.statN}>{score.teamAvg ?? "-"}</Text>
                <Text style={st.muted}>Team average</Text>
              </View>
              <View style={st.stat}>
                <Text style={st.statN}>{score.leader ?? "-"}</Text>
                <Text style={st.muted}>Leader</Text>
              </View>
              <View style={st.stat}>
                <Text style={st.statN}>{score.teamRange ? `${score.teamRange.min} to ${score.teamRange.max}` : "-"}</Text>
                <Text style={st.muted}>Team range</Text>
              </View>
            </View>
            {s.score_read ? <Text style={{ marginTop: 6 }}>{s.score_read}</Text> : null}
            <Text style={st.h3} minPresenceAhead={40}>Why that score</Text>
            <Themes items={s.score_reasons} total={stats.teamCount} />
            <Text style={st.h3} minPresenceAhead={40}>What would get us to a 10</Text>
            <Themes items={s.path_to_10} total={stats.teamCount} />
            <Good good={GOOD.score} compare={fc.score} />
          </View>
        ) : null}

        <Text style={st.h2} minPresenceAhead={80}>A draft value statement</Text>
        <Text style={st.statement}>{s.value_statement}</Text>
        {s.value_statement_options?.map((v, i) => (
          <Text key={i} style={{ marginTop: 4, color: NAVY }}>
            Or: {v}
          </Text>
        ))}

        <Text style={st.h2} minPresenceAhead={80}>A draft scoreboard</Text>
        <Good good={GOOD.scoreboard} compare={fc.scoreboard} />
        {s.scoreboard.map((m, i) => (
          <View key={i} style={[st.card, { marginTop: 6 }]} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY }}>{m.metric}</Text>
            <Text style={st.muted}>{m.why}</Text>
          </View>
        ))}

        <Text style={st.h2} minPresenceAhead={80}>Where the week goes</Text>
        {stats.mix.map((m) => (
          <View key={m.id} wrap={false}>
            {m.parts.map((p) => (
              <View key={p.id}>
                <View style={st.row}>
                  <Text>{p.label}</Text>
                  <Text style={st.muted}>
                    Team {m.team[p.id]}%{m.leader ? `, leader ${m.leader[p.id] ?? 0}%` : ""}, range {m.range[p.id].min} to{" "}
                    {m.range[p.id].max}%
                  </Text>
                </View>
                <View style={st.barBg}>
                  <View style={[st.bar, { width: `${m.team[p.id]}%` }]} />
                </View>
              </View>
            ))}
          </View>
        ))}
        <Text>{s.mix_read}</Text>
        {s.work_map?.map((b) => (
          <View key={b.bucket}>
            <Text style={st.h3} minPresenceAhead={40}>{b.bucket}</Text>
            <Themes items={b.themes} total={stats.teamCount} />
          </View>
        ))}
        {s.work_disagreements?.length ? (
          <View>
            <Text style={st.h3} minPresenceAhead={40}>Where the team sorts the same work differently</Text>
            {s.work_disagreements.map((d, i) => (
              <Text key={i}>• {d}</Text>
            ))}
          </View>
        ) : null}
        <Good good={GOOD.week} compare={fc.week} />

        {s.one_change?.length ? (
          <View>
            <Text style={st.h2} minPresenceAhead={80}>Where the team wants to start</Text>
            <Themes items={s.one_change} total={stats.teamCount} />
            <Good good={GOOD.changes} compare={fc.changes} />
          </View>
        ) : null}

        <Text style={st.h2} minPresenceAhead={80}>Questions for your team meeting</Text>
        {s.discussion_questions.map((q, i) => (
          <Text key={i}>
            {i + 1}. {q}
          </Text>
        ))}

        <Text style={st.h2} minPresenceAhead={80}>Next steps</Text>
        {s.next_steps.map((q, i) => (
          <Text key={i}>
            {i + 1}. {q}
          </Text>
        ))}
        <Text style={{ marginTop: 10, color: GOLD_DARK }}>
          Run a team alignment workshop: stratechi.com/team-alignment-workshop/
        </Text>

        <View style={st.footer} fixed>
          <Text>Team Starters by Stratechi · app.stratechi.com · Answers are anonymous and grouped into themes.</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function readoutPdfBuffer(props: Parameters<typeof ReadoutPdf>[0]): Promise<Buffer> {
  return renderToBuffer(<ReadoutPdf {...props} />);
}
