import { FlexWidget, TextWidget } from "react-native-android-widget";

import { composeUrl } from "@/state/compose-intent";
import { colors } from "@/theme";

type Props = {
  paired: boolean;
};

export function JarvisWidget({ paired }: Props) {
  const fieldLabel = paired ? "Command Jarvis…" : "Pair in the app first";
  const fieldUri = composeUrl("type");
  const micUri = composeUrl("mic");
  const camUri = composeUrl("cam");

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: colors.bg,
        padding: 12,
        flexDirection: "column",
        justifyContent: "center",
        flexGap: 8,
        borderRadius: 16,
      }}>
      <TextWidget
        text="JARVIS"
        style={{
          color: colors.text,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 2,
        }}
      />
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "match_parent",
          flexGap: 8,
        }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: fieldUri }}
          style={{
            flex: 1,
            height: 40,
            backgroundColor: colors.elevated,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 12,
            justifyContent: "center",
          }}>
          <TextWidget
            text={fieldLabel}
            style={{ color: colors.faint, fontSize: 13 }}
            truncate="END"
            maxLines={1}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: micUri }}
          style={{
            height: 40,
            width: 48,
            backgroundColor: colors.elevated,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}>
          <TextWidget
            text="MIC"
            style={{
              color: colors.text,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: camUri }}
          style={{
            height: 40,
            width: 48,
            backgroundColor: colors.elevated,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}>
          <TextWidget
            text="CAM"
            style={{
              color: colors.text,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
