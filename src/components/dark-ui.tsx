import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export const LAVENDER = '#C0C4FC';

export const php = (value: unknown, digits = 2) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
export const fmtDate = (value?: string | null) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

/** Horizontal underline sub navigation. */
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View className="border-b border-[#2D2F31]">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}>
        {tabs.map((tab) => {
          const active = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              className={`border-b-2 pb-3 pt-2 ${active ? 'border-white' : 'border-transparent'}`}>
              <Text
                className={`text-[16px] font-bold ${active ? 'text-white' : 'text-[#6A6F73]'}`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Rounded filter pills. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            className={`rounded-full border-2 border-white px-5 py-2 ${active ? 'bg-white' : 'bg-black'}`}>
            <Text className={`text-[15px] font-bold ${active ? 'text-black' : 'text-white'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="flex-1 rounded-lg border border-[#2D2F31] bg-black p-4">
      <Text className="text-[12px] font-bold uppercase tracking-wide text-[#D1D7DC]">{label}</Text>
      <Text className="mt-2 text-[22px] font-bold text-white">{value}</Text>
      {hint ? <Text className="mt-1 text-[13px] text-[#D1D7DC]">{hint}</Text> : null}
    </View>
  );
}

export function StatGrid({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View className="gap-3">
      {rows.map((row, index) => (
        <View key={index} className="flex-row gap-3">
          {row.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

export function Empty({ children }: { children: string }) {
  return <Text className="py-10 text-center text-[16px] text-[#D1D7DC]">{children}</Text>;
}

export function SectionTitle({ children }: { children: string }) {
  return <Text className="mb-4 mt-6 text-[22px] font-bold text-white">{children}</Text>;
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-[#2D2F31] py-4">
      <Text className="mr-4 text-[16px] text-[#D1D7DC]">{label}</Text>
      <Text className="flex-1 text-right text-[16px] font-bold text-white">{value}</Text>
    </View>
  );
}

export function Bar({ value, max }: { value: number; max: number }) {
  return (
    <View className="mt-2 h-1 overflow-hidden rounded-full bg-[#3E4143]">
      <View
        style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, backgroundColor: LAVENDER }}
        className="h-1"
      />
    </View>
  );
}

/** Per-row horizontal bar list: one row per label with its value. */
export function BarList({
  rows,
  format = (v: number) => String(v),
}: {
  rows: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  if (!rows.length) return <Empty>No data yet.</Empty>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <View>
      {rows.map((row, index) => (
        <View key={`${row.label}-${index}`} className="mb-5">
          <View className="flex-row justify-between">
            <Text numberOfLines={1} className="mr-3 flex-1 text-[16px] text-white">
              {row.label}
            </Text>
            <Text className="text-[16px] font-bold text-white">{format(row.value)}</Text>
          </View>
          <Bar value={row.value} max={max} />
        </View>
      ))}
    </View>
  );
}

/** Vertical column chart. */
export function Columns({
  data,
  format = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  if (!data.length) return <Empty>No data for this range.</Empty>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
      <View className="flex-row items-end" style={{ height: 170, gap: 10, paddingTop: 20 }}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} className="items-center justify-end" style={{ width: 44 }}>
            <Text className="mb-1 text-[10px] text-[#D1D7DC]" numberOfLines={1}>
              {d.value > 0 ? format(d.value) : ''}
            </Text>
            <View
              style={{
                height: Math.max(3, (d.value / max) * 110),
                width: 24,
                backgroundColor: LAVENDER,
                borderRadius: 3,
              }}
            />
            <Text className="mt-1 text-[11px] text-[#D1D7DC]" numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-full bg-white py-3.5 active:opacity-80 ${disabled ? 'opacity-40' : ''}`}>
      <Text className="text-[17px] font-bold text-black">{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center rounded-full border-2 border-white bg-black px-5 py-2.5 active:opacity-70">
      <Text className="text-[15px] font-bold text-white">{label}</Text>
    </Pressable>
  );
}

/** Bottom sheet modal on a dark surface. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-2xl border-t border-[#2D2F31] bg-[#1C1D1F] px-4 pb-8 pt-4"
          style={{ maxHeight: '85%', width: '100%', maxWidth: 430, alignSelf: 'center' }}>
          <View className="mb-3 flex-row items-center">
            <Text className="flex-1 text-[20px] font-bold text-white">{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <FontAwesome name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
