import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Card, ErrorState, LoadingState, PrimaryButton } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors, spacing } from '@/constants/theme';
import { getHealthContacts } from '@/services/api';
import type { HealthContact } from '@/types/api';

function contactLink(value: string) {
  const email = value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  if (email) return `mailto:${email}`;
  if (value.includes('741741')) return 'sms:741741&body=HELLO';
  if (value.includes('988')) return 'tel:988';
  const phone = value.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0];
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
}

export default function HelpScreen() {
  const [contacts, setContacts] = useState<HealthContact[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setContacts(await getHealthContacts());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load contacts.');
    }
  }

  useEffect(() => {
    let active = true;
    getHealthContacts()
      .then((value) => {
        if (active) setContacts(value);
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load contacts.');
      });
    return () => {
      active = false;
    };
  }, []);

  if (!contacts.length && !error) return <LoadingState label="Loading Rutgers health contacts…" />;
  if (error && !contacts.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const emergencies = contacts.filter((contact) => contact.type === 'Emergency');
  const otherContacts = contacts.filter((contact) => contact.type !== 'Emergency');

  return (
    <Screen>
      <Card style={styles.emergencyCard}>
        <Text style={styles.emergencyLabel}>MEDICAL EMERGENCY</Text>
        <Text style={styles.emergencyTitle}>Call 911 now</Text>
        <Text style={styles.emergencyText}>RU Relief is not an emergency service and does not diagnose conditions.</Text>
        <PrimaryButton label="Call 911" destructive onPress={() => void Linking.openURL('tel:911')} />
      </Card>

      <Text style={styles.pageHeading}>Rutgers emergency contacts</Text>
      {emergencies.map((contact) => <ContactCard key={contact.contactId} contact={contact} />)}

      <Text style={styles.pageHeading}>Health and support</Text>
      {otherContacts.map((contact) => <ContactCard key={contact.contactId} contact={contact} />)}
    </Screen>
  );
}

function ContactCard({ contact }: { contact: HealthContact }) {
  const link = contactLink(contact.phoneOrContact);
  return (
    <Card>
      <View style={styles.contactHeader}>
        <View style={styles.contactCopy}>
          <Text style={styles.type}>{contact.type.toUpperCase()}</Text>
          <Text style={styles.name}>{contact.name}</Text>
        </View>
        {contact.verified ? <Text style={styles.verified}>Verified</Text> : null}
      </View>
      <Text style={styles.when}>{contact.whenToUse}</Text>
      <Text style={styles.contactValue}>{contact.phoneOrContact}</Text>
      {link ? <PrimaryButton label="Contact" onPress={() => void Linking.openURL(link)} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  pageHeading: { color: colors.white, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  emergencyCard: { backgroundColor: colors.dangerSoft, borderColor: '#F4BCC7' },
  emergencyLabel: { color: colors.danger, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  emergencyTitle: { color: colors.danger, fontSize: 28, fontWeight: '900' },
  emergencyText: { color: '#7B2332', lineHeight: 21 },
  contactHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  contactCopy: { flex: 1 },
  type: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  name: { color: colors.ink, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  verified: { color: colors.available, backgroundColor: colors.availableSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  when: { color: colors.inkMuted, lineHeight: 21 },
  contactValue: { color: colors.primaryDark, fontWeight: '800' },
});
