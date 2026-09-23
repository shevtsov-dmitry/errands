import { useState, useEffect } from 'react';
import { MantineProvider, Container, TextInput, ActionIcon, Stack, Paper, Text, Group, Modal, Button, createTheme } from '@mantine/core';
import { IconPlus, IconGripVertical, IconCheck } from '@tabler/icons-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '@mantine/core/styles.css';

// Nord Theme Customization
const nordTheme = createTheme({
  primaryColor: 'cyan',
  colors: {
    cyan: ['#E5E9F0', '#D8DEE9', '#E5E9F0', '#8FBCBB', '#88C0D0', '#81A1C1', '#5E81AC', '#4C566A', '#434C5E', '#3B4252'],
    dark: ['#ECEFF4', '#E5E9F0', '#D8DEE9', '#4C566A', '#434C5E', '#3B4252', '#2E3440', '#2E3440', '#2E3440', '#2E3440'],
  },
  fontFamily: 'Inter, sans-serif',
});

interface Errand { id: string; text: string; position: number; }

function SortableItem({ id, text, onComplete }: { id: string, text: string, onComplete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <Paper ref={setNodeRef} style={style} shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" style={{ flex: 1 }}>
          <ActionIcon variant="subtle" color="gray" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
            <IconGripVertical size={18} />
          </ActionIcon>
          <Text style={{ wordBreak: 'break-word' }}>{text}</Text>
        </Group>
        <ActionIcon variant="light" color="teal" onClick={() => onComplete(id)}>
          <IconCheck size={18} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

export default function App() {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [input, setInput] = useState('');
  const [confirmModal, setConfirmModal] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetch('/api/errands').then(r => r.json()).then(setErrands);
  }, []);

  const addErrand = async () => {
    if (!input.trim()) return;
    const newErrand = { id: Date.now().toString(), text: input, position: errands.length };
    setErrands([...errands, newErrand]);
    setInput('');
    await fetch('/api/errands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newErrand)
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = errands.findIndex(e => e.id === active.id);
      const newIndex = errands.findIndex(e => e.id === over.id);
      const newOrder = arrayMove(errands, oldIndex, newIndex).map((e, i) => ({ ...e, position: i }));
      setErrands(newOrder);

      await fetch('/api/errands/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newOrder.map(e => ({ id: e.id, position: e.position })) })
      });
    }
  };

  const completeErrand = async () => {
    if (!confirmModal) return;
    setErrands(errands.filter(e => e.id !== confirmModal));
    await fetch(`/api/errands/${confirmModal}`, { method: 'DELETE' });
    setConfirmModal(null);
  };

  return (
    <MantineProvider theme={nordTheme} defaultColorScheme="auto">
      {/* Container is narrow on desktop (size="sm"), fullscreen on mobile (px={0} when small) */}
      <Container size="sm" p={{ base: 0, sm: 'md' }} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Top Input Row */}
        <Paper p="md" radius={0} shadow="xs" style={{ zIndex: 10 }}>
          <TextInput
            placeholder="Add new errand..."
            size="lg"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && addErrand()}
            rightSection={
              <ActionIcon size={32} radius="xl" color="cyan" variant="filled" onClick={addErrand}>
                <IconPlus size={18} />
              </ActionIcon>
            }
          />
        </Paper>

        {/* Scrollable List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={errands} strategy={verticalListSortingStrategy}>
              <Stack gap="md">
                {errands.map(errand => (
                  <SortableItem key={errand.id} id={errand.id} text={errand.text} onComplete={setConfirmModal} />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </div>

        {/* Confirmation Modal */}
        <Modal opened={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirm Completion" centered>
          <Text mb="lg">Are you sure you completed this errand?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button color="teal" onClick={completeErrand}>Complete</Button>
          </Group>
        </Modal>

      </Container>
    </MantineProvider>
  );
}
