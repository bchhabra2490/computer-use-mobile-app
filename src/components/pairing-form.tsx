import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { testConnection } from "@/api/client";
import { AppButton } from "@/components/app-button";
import { FieldLabel, Panel } from "@/components/chrome";
import {
  DEFAULT_PORT,
  TOKEN_LENGTH,
  isValidToken,
  maskToken,
  normalizeToken,
  parseHostPort,
  type Pairing,
} from "@/storage/pairing";
import { colors, fonts, hairline, radii } from "@/theme";

type Props = {
  initial?: Pairing | null;
  saveLabel?: string;
  onSave: (pairing: Pairing) => Promise<void>;
  footer?: ReactNode;
};

export function PairingForm({ initial, saveLabel = "Save", onSave, footer }: Props) {
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(String(initial?.port ?? DEFAULT_PORT));
  const [token, setToken] = useState(
    initial?.token && isValidToken(initial.token) ? initial.token : "",
  );
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const buildPairing = (): Pairing | string => {
    const parsed = parseHostPort(host, Number(port) || DEFAULT_PORT);
    const portFromField = Number(port);
    const hostHadExplicitPort =
      /:\d+/.test(host.trim()) || /^https?:\/\//i.test(host.trim());
    const resolvedPort = hostHadExplicitPort
      ? parsed.port
      : Number.isFinite(portFromField) && portFromField > 0
        ? portFromField
        : parsed.port;
    const resolvedHost = parsed.host;
    const resolvedToken = normalizeToken(token);
    if (!resolvedHost) return "Enter the Mac host (LAN IP or Tailscale IP).";
    if (!Number.isFinite(resolvedPort) || resolvedPort <= 0 || resolvedPort > 65535) {
      return "Port must be between 1 and 65535.";
    }
    if (!isValidToken(resolvedToken)) {
      return `Token is exactly ${TOKEN_LENGTH} characters.`;
    }
    return { host: resolvedHost, port: resolvedPort, token: resolvedToken };
  };

  const onHostBlur = () => {
    const parsed = parseHostPort(host, Number(port) || DEFAULT_PORT);
    if (parsed.host) setHost(parsed.host);
    if (parsed.port && host.includes(":")) setPort(String(parsed.port));
  };

  const runTest = async (): Promise<Pairing | null> => {
    const built = buildPairing();
    if (typeof built === "string") {
      setOk(false);
      setMessage(built);
      return null;
    }
    setTesting(true);
    setMessage(null);
    try {
      const result = await testConnection(built);
      if (result.ok) {
        setHost(built.host);
        setPort(String(built.port));
        setToken(built.token);
        setOk(true);
        setMessage(
          `Reachable · ${result.status.state}${result.status.detail ? ` · ${result.status.detail}` : ""}`,
        );
        return built;
      }
      setOk(false);
      setMessage(result.error);
      return null;
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.masthead}>
        <Text style={styles.brand}>JARVIS</Text>
        <Text style={styles.kicker}>Remote · Mac pairing</Text>
      </View>

      <Panel label="Gateway">
        <Text style={styles.helpCode}>PHONE_GATEWAY=1 python orchestrator.py --auto</Text>
        <Text style={styles.help}>
          Copy the printed URL and the 5-character Bearer token. Same Wi‑Fi or Tailscale.
          iPhone hotspot usually will not work.
        </Text>
      </Panel>

      <View style={styles.fields}>
        <FieldLabel>Host</FieldLabel>
        <TextInput
          value={host}
          onChangeText={setHost}
          onBlur={onHostBlur}
          placeholder="192.168.1.10 or 100.x.y.z"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType="url"
          textContentType="URL"
          selectionColor={colors.accent}
          style={styles.input}
        />

        <FieldLabel>Port</FieldLabel>
        <TextInput
          value={port}
          onChangeText={setPort}
          placeholder="8742"
          placeholderTextColor={colors.faint}
          keyboardType="number-pad"
          selectionColor={colors.accent}
          style={[styles.input, styles.mono]}
        />

        <FieldLabel>Token · 5 characters</FieldLabel>
        <TextInput
          value={token}
          onChangeText={(value) => setToken(value.replace(/\s+/g, "").slice(0, TOKEN_LENGTH))}
          placeholder="ABC12"
          placeholderTextColor={colors.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          maxLength={TOKEN_LENGTH}
          keyboardType="default"
          selectionColor={colors.accent}
          style={[styles.input, styles.token]}
        />
        {initial?.token && token === initial.token ? (
          <Text style={styles.mask}>Saved {maskToken(initial.token)}</Text>
        ) : null}
      </View>

      {message ? (
        <Text style={[styles.message, ok ? styles.ok : styles.bad]}>{message}</Text>
      ) : null}

      <View style={styles.row}>
        <AppButton
          label="Test connection"
          onPress={() => void runTest()}
          busy={testing}
          disabled={testing || saving}
          flex
        />
        <AppButton
          label={saveLabel}
          variant="primary"
          busy={saving}
          disabled={testing || saving}
          flex
          onPress={() => {
            void (async () => {
              setSaving(true);
              try {
                const built = await runTest();
                if (!built) return;
                await onSave(built);
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      </View>

      {testing || saving ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.busyText}>
            {testing ? "GET /v1/health → /v1/status" : "Writing pairing…"}
          </Text>
        </View>
      ) : null}

      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  masthead: {
    gap: 4,
    marginBottom: 4,
  },
  brand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
  },
  kicker: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  helpCode: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.mono,
  },
  help: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  fields: {
    gap: 8,
  },
  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: hairline,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  mono: {
    fontFamily: fonts.mono,
  },
  token: {
    fontFamily: fonts.mono,
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  mask: {
    color: colors.faint,
    fontSize: 12,
    fontFamily: fonts.mono,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
  ok: { color: colors.done },
  bad: { color: colors.error },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  busyText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
  },
});
