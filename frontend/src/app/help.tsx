import { useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';

import { ErrorState, Group, LoadingState, Row } from '@/components/ui';
import { Screen } from '@/components/screen';
import { colors } from '@/constants/theme';
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
      <Group
        header="Medical emergency"
        footer="RU Relief is not an emergency service and does not diagnose conditions."
      >
        <Row title="Call 911" tone="danger" onPress={() => void Linking.openURL('tel:911')} />
      </Group>

      <Group header="Rutgers emergency contacts">
        {emergencies.map((contact) => <ContactRow key={contact.contactId} contact={contact} />)}
      </Group>

      <Group header="Health and support">
        {otherContacts.map((contact) => <ContactRow key={contact.contactId} contact={contact} />)}
      </Group>
    </Screen>
  );
}

function ContactRow({ contact }: { contact: HealthContact }) {
  const link = contactLink(contact.phoneOrContact);
  return (
    <Row
      title={contact.name}
      subtitle={
        <>
          <Text style={{ color: link ? colors.tint : colors.inkMuted }}>{contact.phoneOrContact}</Text>
          {contact.verified ? ' · Verified' : ''}
        </>
      }
      detail={contact.whenToUse}
      onPress={link ? () => void Linking.openURL(link) : undefined}
    />
  );
}
