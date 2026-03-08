'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ArrowLeft, Calendar, MapPin, Users, Settings, Plus,
    Coffee, Map, Camera, Utensils, ChevronDown, ChevronRight, LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';

type Collaborator = {
    id: string;
    name: string;
    initial: string;
    color: string;
};

type TripDetails = {
    id: string;
    title: string;
    description: string | null;
    destination: string;
    category: string;
    timeMode: 'FIXED' | 'FLEXIBLE';
    startDate: string;
    endDate: string;
    planningStartDate: string | null;
    planningEndDate: string | null;
    plannedDurationDays: number | null;
    participantMode: 'NONE' | 'FIXED' | 'RANGE';
    participantFixedCount: number | null;
    participantMinCount: number | null;
    participantMaxCount: number | null;
    coverImage: string;
    collaborators: Collaborator[];
    itineraryDays: {
        id: string;
        dayNumber: number;
        summary: string;
        location: string;
        activities: {
            id: string;
            time: string;
            title: string;
            type: 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY';
        }[];
        tags: string[];
    }[];
    budgetItems: {
        id: string;
        title: string;
        category: string;
        pricingMode: 'PER_PERSON' | 'GROUP_TOTAL';
        peopleCount: number;
        estimatedCostCents: number;
        dayStart: number | null;
        dayEnd: number | null;
        notes: string | null;
    }[];
};

type Props = {
    trip: TripDetails;
    canManage: boolean;
    canViewParticipants: boolean;
    initialTab?: TripTab;
};

type ItineraryDay = TripDetails['itineraryDays'][number];
type BudgetItem = TripDetails['budgetItems'][number];
type ItineraryBlock = {
    id: string;
    start: number;
    end: number;
    days: ItineraryDay[];
};

type TripTab = 'overview' | 'itinerary' | 'explore' | 'budget';

const BUDGET_CATEGORIES = [
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'ACCOMMODATION', label: 'Accommodation' },
    { value: 'FOOD', label: 'Food' },
    { value: 'ACTIVITIES', label: 'Activities' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'OTHER', label: 'Other' },
] as const;

const BUDGET_PRICING_MODES = [
    { value: 'GROUP_TOTAL', label: 'Total for group' },
    { value: 'PER_PERSON', label: 'Fixed per person' },
] as const;

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
    }).format(cents / 100);

const formatBudgetCategory = (category: string) =>
    BUDGET_CATEGORIES.find((entry) => entry.value === category)?.label || category;

const formatBudgetPricingMode = (pricingMode: BudgetItem['pricingMode']) =>
    BUDGET_PRICING_MODES.find((entry) => entry.value === pricingMode)?.label || pricingMode;

const formatBudgetDayRange = (dayStart: number | null, dayEnd: number | null) => {
    if (dayStart == null || dayEnd == null) {
        return null;
    }
    return dayStart === dayEnd ? `Day ${dayStart}` : `Days ${dayStart}-${dayEnd}`;
};

const formatTripTimeframe = (trip: Pick<TripDetails, 'timeMode' | 'startDate' | 'endDate' | 'planningStartDate' | 'planningEndDate' | 'plannedDurationDays'>) => {
    if (trip.timeMode === 'FLEXIBLE') {
        const planningStart = trip.planningStartDate ? new Date(trip.planningStartDate) : null;
        const planningEnd = trip.planningEndDate ? new Date(trip.planningEndDate) : null;
        const windowLabel =
            planningStart && planningEnd
                ? `${format(planningStart, 'MMM d')} - ${format(planningEnd, 'MMM d, yyyy')}`
                : `${format(new Date(trip.startDate), 'MMM d')} - ${format(new Date(trip.endDate), 'MMM d, yyyy')}`;
        const durationLabel = `${trip.plannedDurationDays ?? 1} day${trip.plannedDurationDays === 1 ? '' : 's'}`;
        return `Flexible window: ${windowLabel} • Planned duration: ${durationLabel}`;
    }

    return `${format(new Date(trip.startDate), 'MMM d')} - ${format(new Date(trip.endDate), 'MMM d, yyyy')}`;
};

const formatPlannedParticipants = (
    trip: Pick<TripDetails, 'participantMode' | 'participantFixedCount' | 'participantMinCount' | 'participantMaxCount'>
) => {
    if (trip.participantMode === 'FIXED' && trip.participantFixedCount != null) {
        return `${trip.participantFixedCount}`;
    }
    if (trip.participantMode === 'RANGE' && trip.participantMinCount != null && trip.participantMaxCount != null) {
        return `${trip.participantMinCount}-${trip.participantMaxCount}`;
    }
    return 'Not specified';
};

const getBudgetItemTotalCents = (item: BudgetItem) =>
    item.pricingMode === 'PER_PERSON'
        ? item.estimatedCostCents * item.peopleCount
        : item.estimatedCostCents;

const getBudgetItemPerPersonCents = (item: BudgetItem) =>
    item.pricingMode === 'PER_PERSON'
        ? item.estimatedCostCents
        : Math.round(item.estimatedCostCents / Math.max(1, item.peopleCount));

export default function TripDetailsClient({ trip, canManage, canViewParticipants, initialTab = 'overview' }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const getTabFromPathname = (currentPathname: string | null): TripTab => {
        if (!currentPathname) {
            return initialTab;
        }

        const parts = currentPathname.split('/').filter(Boolean);
        const lastSegment = parts[parts.length - 1];
        if (lastSegment === 'itinerary' || lastSegment === 'explore' || lastSegment === 'budget') {
            return lastSegment;
        }

        return 'overview';
    };

    const activeTab = getTabFromPathname(pathname);
    const [itineraryDays, setItineraryDays] = useState(trip.itineraryDays);
    const [budgetItems, setBudgetItems] = useState(trip.budgetItems);
    const [showAddDayForm, setShowAddDayForm] = useState(false);
    const [showAddBudgetForm, setShowAddBudgetForm] = useState(false);
    const [dayNumber, setDayNumber] = useState(
        itineraryDays.length > 0 ? Math.max(...itineraryDays.map((day) => day.dayNumber)) + 1 : 1
    );
    const [blockLength, setBlockLength] = useState(1);
    const [summary, setSummary] = useState('');
    const [location, setLocation] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [isSavingDay, setIsSavingDay] = useState(false);
    const [isUpdatingDay, setIsUpdatingDay] = useState(false);
    const [isDeletingDay, setIsDeletingDay] = useState(false);
    const [isSavingBudget, setIsSavingBudget] = useState(false);
    const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
    const [isDeletingBudgetId, setIsDeletingBudgetId] = useState<string | null>(null);
    const [isSavingActivity, setIsSavingActivity] = useState(false);
    const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);
    const [isDeletingActivityId, setIsDeletingActivityId] = useState<string | null>(null);
    const [editingDayId, setEditingDayId] = useState<string | null>(null);
    const [activityFormDayId, setActivityFormDayId] = useState<string | null>(null);
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const [editingActivityDayId, setEditingActivityDayId] = useState<string | null>(null);
    const [editingBlockDayIds, setEditingBlockDayIds] = useState<string[]>([]);
    const [editingBlockLength, setEditingBlockLength] = useState(1);
    const [editDayNumber, setEditDayNumber] = useState(1);
    const [editSummary, setEditSummary] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editTagsInput, setEditTagsInput] = useState('');
    const [activityTime, setActivityTime] = useState('');
    const [activityTitle, setActivityTitle] = useState('');
    const [activityType, setActivityType] = useState<'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY'>('ACTIVITY');
    const [editActivityTime, setEditActivityTime] = useState('');
    const [editActivityTitle, setEditActivityTitle] = useState('');
    const [editActivityType, setEditActivityType] = useState<'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY'>('ACTIVITY');
    const [budgetTitle, setBudgetTitle] = useState('');
    const [budgetCategory, setBudgetCategory] = useState<(typeof BUDGET_CATEGORIES)[number]['value']>('TRANSPORT');
    const [budgetPricingMode, setBudgetPricingMode] = useState<(typeof BUDGET_PRICING_MODES)[number]['value']>('GROUP_TOTAL');
    const [budgetPeopleCount, setBudgetPeopleCount] = useState(1);
    const [budgetEstimatedCost, setBudgetEstimatedCost] = useState('');
    const [budgetDayStart, setBudgetDayStart] = useState('');
    const [budgetDayEnd, setBudgetDayEnd] = useState('');
    const [budgetNotes, setBudgetNotes] = useState('');
    const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
    const [editBudgetTitle, setEditBudgetTitle] = useState('');
    const [editBudgetCategory, setEditBudgetCategory] = useState<(typeof BUDGET_CATEGORIES)[number]['value']>('TRANSPORT');
    const [editBudgetPricingMode, setEditBudgetPricingMode] = useState<(typeof BUDGET_PRICING_MODES)[number]['value']>('GROUP_TOTAL');
    const [editBudgetPeopleCount, setEditBudgetPeopleCount] = useState(1);
    const [editBudgetEstimatedCost, setEditBudgetEstimatedCost] = useState('');
    const [editBudgetDayStart, setEditBudgetDayStart] = useState('');
    const [editBudgetDayEnd, setEditBudgetDayEnd] = useState('');
    const [editBudgetNotes, setEditBudgetNotes] = useState('');
    const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
    const [collapsedBudgetCategories, setCollapsedBudgetCategories] = useState<Record<string, boolean>>({});
    const [itineraryError, setItineraryError] = useState('');
    const [budgetError, setBudgetError] = useState('');

    const navigateToTab = (tab: TripTab) => {
        const targetPath = tab === 'overview'
            ? `/trip/${trip.id}`
            : `/trip/${trip.id}/${tab}`;
        if (pathname !== targetPath) {
            router.push(targetPath, { scroll: false });
        }
    };

    const sortedItinerary = useMemo(
        () => [...itineraryDays].sort((a, b) => a.dayNumber - b.dayNumber),
        [itineraryDays]
    );

    const sortActivities = (activities: ItineraryDay['activities']) =>
        [...activities].sort((a, b) => a.time.localeCompare(b.time));

    const groupedItinerary = useMemo(() => {
        if (sortedItinerary.length === 0) {
            return [] as ItineraryBlock[];
        }

        const buildSignature = (day: ItineraryDay) => {
            const normalizedTags = [...day.tags]
                .map((tag) => tag.trim().toLowerCase())
                .sort()
                .join('|');
            const normalizedActivities = [...day.activities]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((activity) => `${activity.time}|${activity.type}|${activity.title.trim().toLowerCase()}`)
                .join('||');

            return `${day.summary.trim().toLowerCase()}::${day.location.trim().toLowerCase()}::${normalizedTags}::${normalizedActivities}`;
        };

        const blocks: ItineraryBlock[] = [];
        let currentBlockDays: ItineraryDay[] = [sortedItinerary[0]];
        let currentSignature = buildSignature(sortedItinerary[0]);

        for (let index = 1; index < sortedItinerary.length; index++) {
            const day = sortedItinerary[index];
            const previousDay = sortedItinerary[index - 1];
            const daySignature = buildSignature(day);
            const isConsecutive = day.dayNumber === previousDay.dayNumber + 1;
            const hasSameSignature = daySignature === currentSignature;

            if (isConsecutive && hasSameSignature) {
                currentBlockDays.push(day);
                continue;
            }

            blocks.push({
                id: currentBlockDays[0].id,
                start: currentBlockDays[0].dayNumber,
                end: currentBlockDays[currentBlockDays.length - 1].dayNumber,
                days: currentBlockDays,
            });

            currentBlockDays = [day];
            currentSignature = daySignature;
        }

        blocks.push({
            id: currentBlockDays[0].id,
            start: currentBlockDays[0].dayNumber,
            end: currentBlockDays[currentBlockDays.length - 1].dayNumber,
            days: currentBlockDays,
        });

        return blocks;
    }, [sortedItinerary]);

    const totalBudgetCents = useMemo(
        () => budgetItems.reduce((sum, item) => sum + getBudgetItemTotalCents(item), 0),
        [budgetItems]
    );

    const totalBudgetPerPersonCents = useMemo(
        () => budgetItems.reduce((sum, item) => sum + getBudgetItemPerPersonCents(item), 0),
        [budgetItems]
    );

    const budgetItemsByCategory = useMemo(() => {
        const groups = new globalThis.Map<string, { count: number; totalCents: number }>();
        budgetItems.forEach((item) => {
            const current = groups.get(item.category) || { count: 0, totalCents: 0 };
            groups.set(item.category, {
                count: current.count + 1,
                totalCents: current.totalCents + getBudgetItemTotalCents(item),
            });
        });
        return Array.from(groups.entries())
            .map(([category, value]) => ({
                category,
                count: value.count,
                totalCents: value.totalCents,
            }))
            .sort((a, b) => b.totalCents - a.totalCents);
    }, [budgetItems]);

    const groupedBudgetItems = useMemo(() => {
        const groupMap = new globalThis.Map<string, BudgetItem[]>();
        budgetItems.forEach((item) => {
            const existing = groupMap.get(item.category) || [];
            groupMap.set(item.category, [...existing, item]);
        });

        const categoryOrder = new globalThis.Map<string, number>(
            BUDGET_CATEGORIES.map((entry, index) => [entry.value, index])
        );

        return Array.from(groupMap.entries())
            .map(([category, items]) => ({
                category,
                items: [...items].sort((a, b) => {
                    const aStart = a.dayStart ?? Number.MAX_SAFE_INTEGER;
                    const bStart = b.dayStart ?? Number.MAX_SAFE_INTEGER;
                    if (aStart !== bStart) {
                        return aStart - bStart;
                    }
                    const aEnd = a.dayEnd ?? Number.MAX_SAFE_INTEGER;
                    const bEnd = b.dayEnd ?? Number.MAX_SAFE_INTEGER;
                    if (aEnd !== bEnd) {
                        return aEnd - bEnd;
                    }
                    return a.title.localeCompare(b.title);
                }),
                totalCents: items.reduce((sum, item) => sum + getBudgetItemTotalCents(item), 0),
                perPersonCents: items.reduce((sum, item) => sum + getBudgetItemPerPersonCents(item), 0),
            }))
            .sort((a, b) => {
                const aOrder = categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER;
                const bOrder = categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER;
                if (aOrder !== bOrder) {
                    return aOrder - bOrder;
                }
                return a.category.localeCompare(b.category);
            });
    }, [budgetItems]);

    const tripDurationDays = useMemo(() => {
        if (trip.timeMode === 'FLEXIBLE') {
            return Math.max(1, trip.plannedDurationDays ?? 1);
        }
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const diffMs = end.getTime() - start.getTime();
        if (Number.isNaN(diffMs)) {
            return 0;
        }
        return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }, [trip.timeMode, trip.plannedDurationDays, trip.startDate, trip.endDate]);

    const totalActivities = useMemo(
        () => itineraryDays.reduce((sum, day) => sum + day.activities.length, 0),
        [itineraryDays]
    );

    const uniqueTagsCount = useMemo(() => {
        const uniqueTags = new Set<string>();
        itineraryDays.forEach((day) => {
            day.tags.forEach((tag) => {
                if (tag.trim().length > 0) {
                    uniqueTags.add(tag.trim().toLowerCase());
                }
            });
        });
        return uniqueTags.size;
    }, [itineraryDays]);

    const toggleDayActivities = (dayId: string) => {
        setCollapsedDays((prev) => ({
            ...prev,
            [dayId]: !prev[dayId],
        }));
    };

    const areAllDaysCollapsed =
        sortedItinerary.length > 0 && sortedItinerary.every((day) => collapsedDays[day.id]);

    const toggleAllDays = () => {
        if (sortedItinerary.length === 0) {
            return;
        }

        const nextCollapsedState = !areAllDaysCollapsed;
        const nextState: Record<string, boolean> = {};
        sortedItinerary.forEach((day) => {
            nextState[day.id] = nextCollapsedState;
        });
        setCollapsedDays(nextState);
    };

    const toggleBudgetCategory = (category: string) => {
        setCollapsedBudgetCategories((prev) => ({
            ...prev,
            [category]: !(prev[category] ?? false),
        }));
    };

    const handleAddDay = async (e: FormEvent) => {
        e.preventDefault();
        setItineraryError('');
        setIsSavingDay(true);

        try {
            const tags = tagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);

            const response = await fetch(`/api/trips/${trip.id}/itinerary/days`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dayNumber,
                    blockLength,
                    summary,
                    location,
                    tags,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setItineraryError(data.message || 'Could not add itinerary day.');
                return;
            }

            const createdDays = Array.isArray(data.days) ? data.days : [];

            setItineraryDays((prev) => [
                ...prev,
                ...createdDays.map((createdDay: {
                    id: string;
                    dayNumber: number;
                    summary: string;
                    location: string;
                    tags: { label: string }[];
                }) => ({
                    id: createdDay.id,
                    dayNumber: createdDay.dayNumber,
                    summary: createdDay.summary,
                    location: createdDay.location,
                    activities: [],
                    tags: Array.isArray(createdDay.tags)
                        ? createdDay.tags.map((tag) => tag.label)
                        : [],
                })),
            ]);
            setSummary('');
            setLocation('');
            setTagsInput('');
            setBlockLength(1);
            setDayNumber((prev) => prev + blockLength);
            setShowAddDayForm(false);
        } catch {
            setItineraryError('Could not add itinerary day.');
        } finally {
            setIsSavingDay(false);
        }
    };

    const startEditDay = (dayId: string, block?: ItineraryBlock) => {
        const day = itineraryDays.find((entry) => entry.id === dayId);
        if (!day) {
            return;
        }
        setItineraryError('');
        setEditingDayId(dayId);
        setEditingBlockDayIds(block ? block.days.map((entry) => entry.id) : [dayId]);
        setEditingBlockLength(block ? block.days.length : 1);
        setEditDayNumber(block ? block.start : day.dayNumber);
        setEditSummary(day.summary);
        setEditLocation(day.location);
        setEditTagsInput(day.tags.join(', '));
    };

    const cancelEditDay = () => {
        setEditingDayId(null);
        setEditingBlockDayIds([]);
        setEditingBlockLength(1);
        setEditDayNumber(1);
        setEditSummary('');
        setEditLocation('');
        setEditTagsInput('');
        setItineraryError('');
    };

    const startAddActivity = (dayId: string) => {
        setItineraryError('');
        setActivityFormDayId(dayId);
        setActivityTime('');
        setActivityTitle('');
        setActivityType('ACTIVITY');
    };

    const cancelAddActivity = () => {
        setActivityFormDayId(null);
        setActivityTime('');
        setActivityTitle('');
        setActivityType('ACTIVITY');
    };

    const handleAddActivity = async (e: FormEvent, dayId: string) => {
        e.preventDefault();
        setItineraryError('');
        setIsSavingActivity(true);

        try {
            const response = await fetch(`/api/trips/${trip.id}/itinerary/days/${dayId}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    time: activityTime,
                    title: activityTitle,
                    type: activityType,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setItineraryError(data.message || 'Could not add activity.');
                return;
            }

            setItineraryDays((prev) =>
                prev.map((day) =>
                    day.id === dayId
                        ? {
                              ...day,
                              activities: sortActivities([
                                  ...day.activities,
                                  {
                                      id: data.activity.id as string,
                                      time: data.activity.time as string,
                                      title: data.activity.title as string,
                                      type: data.activity.type as 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY',
                                  },
                              ]),
                          }
                        : day
                )
            );
            cancelAddActivity();
        } catch {
            setItineraryError('Could not add activity.');
        } finally {
            setIsSavingActivity(false);
        }
    };

    const renderActivityIcon = (type: 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY') => {
        if (type === 'FLIGHT') return <Map className="h-4 w-4" />;
        if (type === 'LODGING') return <MapPin className="h-4 w-4" />;
        if (type === 'FOOD') return <Utensils className="h-4 w-4" />;
        return <Camera className="h-4 w-4" />;
    };

    const startEditActivity = (
        dayId: string,
        activity: TripDetails['itineraryDays'][number]['activities'][number]
    ) => {
        setItineraryError('');
        setEditingActivityDayId(dayId);
        setEditingActivityId(activity.id);
        setEditActivityTime(activity.time);
        setEditActivityTitle(activity.title);
        setEditActivityType(activity.type);
    };

    const cancelEditActivity = () => {
        setEditingActivityDayId(null);
        setEditingActivityId(null);
        setEditActivityTime('');
        setEditActivityTitle('');
        setEditActivityType('ACTIVITY');
    };

    const handleUpdateActivity = async (e: FormEvent, dayId: string, activityId: string) => {
        e.preventDefault();
        setItineraryError('');
        setIsUpdatingActivity(true);

        try {
            const response = await fetch(
                `/api/trips/${trip.id}/itinerary/days/${dayId}/activities/${activityId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        time: editActivityTime,
                        title: editActivityTitle,
                        type: editActivityType,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setItineraryError(data.message || 'Could not update activity.');
                return;
            }

            setItineraryDays((prev) =>
                prev.map((day) =>
                    day.id === dayId
                        ? {
                              ...day,
                              activities: sortActivities(
                                  day.activities.map((activity) =>
                                      activity.id === activityId
                                          ? {
                                                id: data.activity.id as string,
                                                time: data.activity.time as string,
                                                title: data.activity.title as string,
                                                type: data.activity.type as
                                                    | 'FLIGHT'
                                                    | 'LODGING'
                                                    | 'FOOD'
                                                    | 'ACTIVITY',
                                            }
                                          : activity
                                  )
                              ),
                          }
                        : day
                )
            );

            cancelEditActivity();
        } catch {
            setItineraryError('Could not update activity.');
        } finally {
            setIsUpdatingActivity(false);
        }
    };

    const handleDeleteActivity = async (dayId: string, activityId: string) => {
        const confirmed = window.confirm('Delete this activity?');
        if (!confirmed) {
            return;
        }

        setItineraryError('');
        setIsDeletingActivityId(activityId);

        try {
            const response = await fetch(
                `/api/trips/${trip.id}/itinerary/days/${dayId}/activities/${activityId}`,
                {
                    method: 'DELETE',
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setItineraryError(data.message || 'Could not delete activity.');
                return;
            }

            setItineraryDays((prev) =>
                prev.map((day) =>
                    day.id === dayId
                        ? {
                              ...day,
                              activities: day.activities.filter((activity) => activity.id !== activityId),
                          }
                        : day
                )
            );
        } catch {
            setItineraryError('Could not delete activity.');
        } finally {
            setIsDeletingActivityId(null);
        }
    };

    const handleUpdateDay = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingDayId) {
            return;
        }

        setItineraryError('');
        setIsUpdatingDay(true);

        try {
            const tags = editTagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0);

            const response = await fetch(`/api/trips/${trip.id}/itinerary/days/${editingDayId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dayNumber: editDayNumber,
                    blockLength: editingBlockLength,
                    blockDayIds: editingBlockDayIds,
                    summary: editSummary,
                    location: editLocation,
                    tags,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setItineraryError(data.message || 'Could not update itinerary day.');
                return;
            }

            const updatedDays = Array.isArray(data.days) ? data.days : [];
            if (updatedDays.length > 0) {
                type UpdatedDayPayload = {
                    id: string;
                    dayNumber: number;
                    summary: string;
                    location: string;
                    tags: string[];
                };

                const normalizedUpdatedDays: UpdatedDayPayload[] = updatedDays.map((updatedDay: {
                    id: string;
                    dayNumber: number;
                    summary: string;
                    location: string;
                    tags: { label: string }[];
                }) => ({
                    id: updatedDay.id,
                    dayNumber: updatedDay.dayNumber,
                    summary: updatedDay.summary,
                    location: updatedDay.location,
                    tags: Array.isArray(updatedDay.tags)
                        ? updatedDay.tags.map((tag) => tag.label)
                        : [],
                }));

                setItineraryDays((prev) => {
                    const previousById = new globalThis.Map(prev.map((day) => [day.id, day]));
                    const idsToReplace = new Set(
                        editingBlockDayIds.length > 0 ? editingBlockDayIds : [editingDayId]
                    );
                    const insertionIndex = prev.findIndex((day) => idsToReplace.has(day.id));
                    const withoutReplaced = prev.filter((day) => !idsToReplace.has(day.id));
                    const replacementDays = normalizedUpdatedDays.map((updatedDay) => ({
                        id: updatedDay.id,
                        dayNumber: updatedDay.dayNumber,
                        summary: updatedDay.summary,
                        location: updatedDay.location,
                        activities: previousById.get(updatedDay.id)?.activities ?? [],
                        tags: updatedDay.tags,
                    }));

                    if (insertionIndex < 0) {
                        return [...withoutReplaced, ...replacementDays];
                    }

                    const next = [...withoutReplaced];
                    next.splice(Math.min(insertionIndex, next.length), 0, ...replacementDays);
                    return next;
                });
            } else {
                setItineraryDays((prev) =>
                    prev.map((day) =>
                        day.id === editingDayId
                            ? {
                                  ...day,
                                  dayNumber: data.day.dayNumber as number,
                                  summary: data.day.summary as string,
                                  location: data.day.location as string,
                                  tags: Array.isArray(data.day.tags)
                                      ? data.day.tags.map((tag: { label: string }) => tag.label)
                                      : [],
                              }
                            : day
                    )
                );
            }

            cancelEditDay();
        } catch {
            setItineraryError('Could not update itinerary day.');
        } finally {
            setIsUpdatingDay(false);
        }
    };

    const handleDeleteDay = async (dayId: string, block?: ItineraryBlock) => {
        const blockDayIds = block ? block.days.map((entry) => entry.id) : [dayId];
        const isBlockDelete = blockDayIds.length > 1;
        const confirmed = window.confirm(
            isBlockDelete
                ? `Delete days ${block?.start}-${block?.end}?`
                : 'Delete this day?'
        );

        if (!confirmed) {
            return;
        }

        setItineraryError('');
        setIsDeletingDay(true);

        try {
            const response = await fetch(`/api/trips/${trip.id}/itinerary/days/${dayId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    blockDayIds,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setItineraryError(data.message || 'Could not delete day.');
                return;
            }

            const deletedIds = Array.isArray(data.deletedDayIds)
                ? (data.deletedDayIds as unknown[]).filter((value): value is string => typeof value === 'string')
                : [];
            const deletedSet = new Set(deletedIds.length > 0 ? deletedIds : blockDayIds);

            setItineraryDays((prev) => prev.filter((day) => !deletedSet.has(day.id)));
            setCollapsedDays((prev) => {
                const next: Record<string, boolean> = {};
                Object.entries(prev).forEach(([entryDayId, value]) => {
                    if (!deletedSet.has(entryDayId)) {
                        next[entryDayId] = value;
                    }
                });
                return next;
            });

            if (editingDayId && deletedSet.has(editingDayId)) {
                cancelEditDay();
            }
            if (activityFormDayId && deletedSet.has(activityFormDayId)) {
                cancelAddActivity();
            }
            if (editingActivityDayId && deletedSet.has(editingActivityDayId)) {
                cancelEditActivity();
            }
        } catch {
            setItineraryError('Could not delete day.');
        } finally {
            setIsDeletingDay(false);
        }
    };

    const resetBudgetForm = () => {
        setBudgetTitle('');
        setBudgetCategory('TRANSPORT');
        setBudgetPricingMode('GROUP_TOTAL');
        setBudgetPeopleCount(1);
        setBudgetEstimatedCost('');
        setBudgetDayStart('');
        setBudgetDayEnd('');
        setBudgetNotes('');
        setShowAddBudgetForm(false);
    };

    const startEditBudgetItem = (item: BudgetItem) => {
        setBudgetError('');
        setEditingBudgetId(item.id);
        setEditBudgetTitle(item.title);
        setEditBudgetCategory(item.category as (typeof BUDGET_CATEGORIES)[number]['value']);
        setEditBudgetPricingMode(item.pricingMode);
        setEditBudgetPeopleCount(item.peopleCount);
        setEditBudgetEstimatedCost((item.estimatedCostCents / 100).toFixed(2));
        setEditBudgetDayStart(item.dayStart == null ? '' : String(item.dayStart));
        setEditBudgetDayEnd(item.dayEnd == null ? '' : String(item.dayEnd));
        setEditBudgetNotes(item.notes || '');
    };

    const cancelEditBudgetItem = () => {
        setEditingBudgetId(null);
        setEditBudgetTitle('');
        setEditBudgetCategory('TRANSPORT');
        setEditBudgetPricingMode('GROUP_TOTAL');
        setEditBudgetPeopleCount(1);
        setEditBudgetEstimatedCost('');
        setEditBudgetDayStart('');
        setEditBudgetDayEnd('');
        setEditBudgetNotes('');
        setBudgetError('');
    };

    const handleAddBudgetItem = async (e: FormEvent) => {
        e.preventDefault();
        setBudgetError('');
        setIsSavingBudget(true);

        try {
            const response = await fetch(`/api/trips/${trip.id}/budget-items`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: budgetTitle,
                    category: budgetCategory,
                    pricingMode: budgetPricingMode,
                    peopleCount: budgetPeopleCount,
                    estimatedCost: budgetEstimatedCost,
                    dayStart: budgetDayStart,
                    dayEnd: budgetDayEnd,
                    notes: budgetNotes,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                setBudgetError(data.message || 'Could not add budget item.');
                return;
            }

            setBudgetItems((prev) => [
                ...prev,
                {
                    id: data.budgetItem.id as string,
                    title: data.budgetItem.title as string,
                    category: data.budgetItem.category as string,
                    pricingMode: data.budgetItem.pricingMode as 'PER_PERSON' | 'GROUP_TOTAL',
                    peopleCount: data.budgetItem.peopleCount as number,
                    estimatedCostCents: data.budgetItem.estimatedCostCents as number,
                    dayStart: (data.budgetItem.dayStart as number | null) ?? null,
                    dayEnd: (data.budgetItem.dayEnd as number | null) ?? null,
                    notes: (data.budgetItem.notes as string | null) || null,
                },
            ]);
            resetBudgetForm();
        } catch {
            setBudgetError('Could not add budget item.');
        } finally {
            setIsSavingBudget(false);
        }
    };

    const handleUpdateBudgetItem = async (e: FormEvent, itemId: string) => {
        e.preventDefault();
        setBudgetError('');
        setIsUpdatingBudget(true);

        try {
            const response = await fetch(`/api/trips/${trip.id}/budget-items/${itemId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: editBudgetTitle,
                    category: editBudgetCategory,
                    pricingMode: editBudgetPricingMode,
                    peopleCount: editBudgetPeopleCount,
                    estimatedCost: editBudgetEstimatedCost,
                    dayStart: editBudgetDayStart,
                    dayEnd: editBudgetDayEnd,
                    notes: editBudgetNotes,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                setBudgetError(data.message || 'Could not update budget item.');
                return;
            }

            setBudgetItems((prev) =>
                prev.map((item) =>
                    item.id === itemId
                        ? {
                              id: data.budgetItem.id as string,
                              title: data.budgetItem.title as string,
                              category: data.budgetItem.category as string,
                              pricingMode: data.budgetItem.pricingMode as 'PER_PERSON' | 'GROUP_TOTAL',
                              peopleCount: data.budgetItem.peopleCount as number,
                              estimatedCostCents: data.budgetItem.estimatedCostCents as number,
                              dayStart: (data.budgetItem.dayStart as number | null) ?? null,
                              dayEnd: (data.budgetItem.dayEnd as number | null) ?? null,
                              notes: (data.budgetItem.notes as string | null) || null,
                          }
                        : item
                )
            );
            cancelEditBudgetItem();
        } catch {
            setBudgetError('Could not update budget item.');
        } finally {
            setIsUpdatingBudget(false);
        }
    };

    const handleDeleteBudgetItem = async (itemId: string) => {
        const confirmed = window.confirm('Delete this budget item?');
        if (!confirmed) {
            return;
        }

        setBudgetError('');
        setIsDeletingBudgetId(itemId);

        try {
            const response = await fetch(`/api/trips/${trip.id}/budget-items/${itemId}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            if (!response.ok) {
                setBudgetError(data.message || 'Could not delete budget item.');
                return;
            }

            setBudgetItems((prev) => prev.filter((item) => item.id !== itemId));
            if (editingBudgetId === itemId) {
                cancelEditBudgetItem();
            }
        } catch {
            setBudgetError('Could not delete budget item.');
        } finally {
            setIsDeletingBudgetId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20">
            <div className="h-44 sm:h-52 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/60 z-10"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={trip.coverImage}
                    alt={trip.title}
                    className="w-full h-full object-cover relative z-0"
                />

                <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20 flex justify-between items-start">
                    <Link href="/dashboard" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div className="flex gap-2">
                        {canViewParticipants && (
                            <Link
                                href={`/trip/${trip.id}/settings/participants`}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors text-sm font-medium"
                                title="Participant management"
                            >
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">Participants</span>
                            </Link>
                        )}
                        {canManage && (
                            <Link
                                href={`/trip/${trip.id}/settings`}
                                className="flex items-center justify-center h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors"
                                title="Trip settings"
                            >
                                <Settings className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 lg:p-4 z-40 max-w-7xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{trip.title}</h1>
                            <div className="mb-2">
                                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                    {trip.category}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-white/90 text-xs sm:text-sm">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <MapPin className="h-4 w-4" />
                                    {trip.destination}
                                </span>
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Calendar className="h-4 w-4" />
                                    {formatTripTimeframe(trip)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center -space-x-2">
                            {trip.collaborators.map((user) => (
                                <div
                                    key={user.id}
                                    className={`h-8 w-8 rounded-full border-2 border-slate-900 ${user.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                                    title={user.name}
                                >
                                    {user.initial}
                                </div>
                            ))}
                            {canViewParticipants ? (
                                <Link
                                    href={`/trip/${trip.id}/settings/participants`}
                                    className="h-8 w-8 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold hover:bg-white/30 transition-colors cursor-pointer shadow-sm"
                                    title="Manage participants"
                                >
                                    <Plus className="h-3 w-3" />
                                </Link>
                            ) : (
                                <div className="h-8 w-8 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    <Plus className="h-3 w-3" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 relative z-20">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <button
                                onClick={() => navigateToTab('overview')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Overview
                            </button>
                            <button
                                onClick={() => navigateToTab('itinerary')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'itinerary' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Map className="h-4 w-4" />
                                Itinerary
                            </button>
                            <button
                                onClick={() => navigateToTab('explore')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'explore' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <MapPin className="h-4 w-4" />
                                Explore Places
                            </button>
                            <button
                                onClick={() => navigateToTab('budget')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'budget' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Coffee className="h-4 w-4" />
                                Budget
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-white">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Trip Overview</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Description, itinerary progress, and budget snapshot in one place.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Description</p>
                                    <p className="mt-2 text-sm text-slate-700">
                                        {trip.description?.trim()
                                            ? trip.description
                                            : 'No description yet. The owner can add one in trip settings.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Category</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{trip.category}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Duration</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{tripDurationDays} days</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Itinerary days</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{itineraryDays.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Planned activities</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{totalActivities}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Planned participants</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{formatPlannedParticipants(trip)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => navigateToTab('itinerary')}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:bg-slate-50"
                                        aria-label="Open itinerary details"
                                    >
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Itinerary Snapshot</h3>
                                        {groupedItinerary.length === 0 ? (
                                            <p className="mt-3 text-sm text-slate-500">No travel days added yet.</p>
                                        ) : (
                                            <div className="mt-4 space-y-3">
                                                {groupedItinerary.slice(0, 3).map((block) => {
                                                    const representativeDay = block.days[0];
                                                    const blockLabel =
                                                        block.days.length > 1
                                                            ? `Days ${block.start}-${block.end}`
                                                            : `Day ${block.start}`;

                                                    return (
                                                    <div key={block.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                        <p className="text-sm font-semibold text-slate-800">{blockLabel}</p>
                                                        <p className="mt-0.5 text-sm text-slate-600">{representativeDay.location}</p>
                                                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{representativeDay.summary}</p>
                                                    </div>
                                                    );
                                                })}
                                                {groupedItinerary.length > 3 && (
                                                    <p className="text-xs text-slate-500">
                                                        +{groupedItinerary.length - 3} more block(s). Open Itinerary for full details.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => navigateToTab('budget')}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:bg-slate-50"
                                        aria-label="Open budget details"
                                    >
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Budget Snapshot</h3>
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Total estimate</p>
                                                <p className="mt-1 text-base font-semibold text-slate-800">{formatCurrency(totalBudgetCents)}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Per person</p>
                                                <p className="mt-1 text-base font-semibold text-slate-800">{formatCurrency(totalBudgetPerPersonCents)}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Budget items</p>
                                                <p className="mt-1 text-base font-semibold text-slate-800">{budgetItems.length}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Used tags</p>
                                                <p className="mt-1 text-base font-semibold text-slate-800">{uniqueTagsCount}</p>
                                            </div>
                                        </div>
                                        {budgetItemsByCategory.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Top budget categories</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {budgetItemsByCategory.slice(0, 3).map((entry) => (
                                                        <span
                                                            key={entry.category}
                                                            className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                                                        >
                                                            {formatBudgetCategory(entry.category)}: {formatCurrency(entry.totalCents)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'itinerary' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Trip Itinerary</h2>
                                    <div className="flex items-center gap-2">
                                        {sortedItinerary.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={toggleAllDays}
                                                className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                {areAllDaysCollapsed ? 'Expand all days' : 'Collapse all days'}
                                            </button>
                                        )}
                                        {canManage && (
                                            <button
                                                onClick={() => setShowAddDayForm((prev) => !prev)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="hidden sm:inline">{showAddDayForm ? 'Cancel' : 'Add Day'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {itineraryError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {itineraryError}
                                    </div>
                                )}

                                {showAddDayForm && canManage && (
                                    <form onSubmit={handleAddDay} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="day-number" className="block text-sm font-medium text-slate-700">
                                                    Start day
                                                </label>
                                                <input
                                                    id="day-number"
                                                    type="number"
                                                    min={1}
                                                    required
                                                    value={dayNumber}
                                                    onChange={(e) => setDayNumber(Number(e.target.value))}
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="block-length" className="block text-sm font-medium text-slate-700">
                                                    Number of days (block)
                                                </label>
                                                <input
                                                    id="block-length"
                                                    type="number"
                                                    min={1}
                                                    max={30}
                                                    required
                                                    value={blockLength}
                                                    onChange={(e) => setBlockLength(Number(e.target.value))}
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="day-location" className="block text-sm font-medium text-slate-700">
                                                    Where do you spend the day?
                                                </label>
                                                <input
                                                    id="day-location"
                                                    type="text"
                                                    required
                                                    value={location}
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="e.g. Kyoto city center"
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="day-summary" className="block text-sm font-medium text-slate-700">
                                                What is planned that day?
                                            </label>
                                            <textarea
                                                id="day-summary"
                                                rows={3}
                                                required
                                                value={summary}
                                                onChange={(e) => setSummary(e.target.value)}
                                                placeholder="Write 1-2 short sentences..."
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="day-tags" className="block text-sm font-medium text-slate-700">
                                                Tags
                                            </label>
                                            <input
                                                id="day-tags"
                                                type="text"
                                                value={tagsInput}
                                                onChange={(e) => setTagsInput(e.target.value)}
                                                placeholder="e.g. culture, food, walking"
                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">Separate tags with commas.</p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSavingDay}
                                            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isSavingDay ? 'Saving...' : 'Save Day'}
                                        </button>
                                    </form>
                                )}

                                {sortedItinerary.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <h3 className="text-lg font-semibold text-slate-800">No itinerary yet</h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {canManage
                                                ? 'Start planning by adding the first travel day.'
                                                : 'The owner has not added travel days yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative pl-7">
                                        <div className="absolute left-2.5 top-1 bottom-1 w-px bg-slate-200" aria-hidden="true" />
                                        <div className="space-y-5">
                                            {groupedItinerary.map((block) => {
                                                const day = block.days[0];
                                                const blockTitle =
                                                    block.days.length > 1
                                                        ? `Days ${block.start}-${block.end}`
                                                        : `Day ${day.dayNumber}`;

                                                return (
                                                    <div key={block.id} className="relative">
                                                        <div className="absolute -left-[1.55rem] top-5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" aria-hidden="true" />
                                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                            {editingDayId === day.id && canManage ? (
                                                                <form onSubmit={handleUpdateDay} className="space-y-4">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label htmlFor={`edit-day-number-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                                {editingBlockLength > 1 ? 'Start day' : 'Travel day'}
                                                                            </label>
                                                                            <input
                                                                                id={`edit-day-number-${day.id}`}
                                                                                type="number"
                                                                                min={1}
                                                                                required
                                                                                value={editDayNumber}
                                                                                onChange={(e) => setEditDayNumber(Number(e.target.value))}
                                                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor={`edit-block-length-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                                Number of days (block)
                                                                            </label>
                                                                            <input
                                                                                id={`edit-block-length-${day.id}`}
                                                                                type="number"
                                                                                min={1}
                                                                                max={30}
                                                                                required
                                                                                value={editingBlockLength}
                                                                                onChange={(e) => setEditingBlockLength(Number(e.target.value))}
                                                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor={`edit-day-location-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                                Where do you spend the day?
                                                                            </label>
                                                                            <input
                                                                                id={`edit-day-location-${day.id}`}
                                                                                type="text"
                                                                                required
                                                                                value={editLocation}
                                                                                onChange={(e) => setEditLocation(e.target.value)}
                                                                                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label htmlFor={`edit-day-summary-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                            What is planned that day?
                                                                        </label>
                                                                        <textarea
                                                                            id={`edit-day-summary-${day.id}`}
                                                                            rows={3}
                                                                            required
                                                                            value={editSummary}
                                                                            onChange={(e) => setEditSummary(e.target.value)}
                                                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label htmlFor={`edit-day-tags-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                            Tags
                                                                        </label>
                                                                        <input
                                                                            id={`edit-day-tags-${day.id}`}
                                                                            type="text"
                                                                            value={editTagsInput}
                                                                            onChange={(e) => setEditTagsInput(e.target.value)}
                                                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                        />
                                                                        <p className="mt-1 text-xs text-slate-500">Separate tags with commas.</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="submit"
                                                                            disabled={isUpdatingDay}
                                                                            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                        >
                                                                            {isUpdatingDay ? 'Saving...' : 'Save changes'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={cancelEditDay}
                                                                            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </form>
                                                            ) : (
                                                                <>
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div>
                                                                            <h3 className="text-lg font-bold text-slate-800">{blockTitle}</h3>
                                                                            <p className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
                                                                                <MapPin className="h-4 w-4 text-blue-500" />
                                                                                {day.location}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleDayActivities(day.id)}
                                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                            >
                                                                                {collapsedDays[day.id] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                                                {collapsedDays[day.id] ? 'Show activities' : 'Hide activities'}
                                                                            </button>
                                                                            {canManage && (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => startEditDay(day.id, block)}
                                                                                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                    >
                                                                                        Edit
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleDeleteDay(day.id, block)}
                                                                                        disabled={isDeletingDay}
                                                                                        className="inline-flex items-center rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                    >
                                                                                        {isDeletingDay
                                                                                            ? 'Deleting...'
                                                                                            : block.days.length > 1
                                                                                                ? 'Delete block'
                                                                                                : 'Delete day'}
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <p className="mt-3 text-sm text-slate-700 leading-6">{day.summary}</p>
                                                                    {!collapsedDays[day.id] && (
                                                                    <div className="mt-4 relative pl-2">
                                                                        {day.activities.length > 0 && (
                                                                            <div className="absolute left-5 top-1 bottom-1 w-px bg-slate-200" aria-hidden="true" />
                                                                        )}
                                                                        <div className="space-y-3">
                                                                        {sortActivities(day.activities).map((activity) => (
                                                                            <div key={activity.id} className="relative flex items-start gap-3">
                                                                                {editingActivityId === activity.id && editingActivityDayId === day.id && canManage ? (
                                                                                    <form
                                                                                        onSubmit={(e) => handleUpdateActivity(e, day.id, activity.id)}
                                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2"
                                                                                    >
                                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                                            <input
                                                                                                required
                                                                                                type="time"
                                                                                                value={editActivityTime}
                                                                                                onChange={(e) => setEditActivityTime(e.target.value)}
                                                                                                className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                            />
                                                                                            <input
                                                                                                required
                                                                                                type="text"
                                                                                                value={editActivityTitle}
                                                                                                onChange={(e) => setEditActivityTitle(e.target.value)}
                                                                                                className="sm:col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <select
                                                                                                value={editActivityType}
                                                                                                onChange={(e) => setEditActivityType(e.target.value as 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY')}
                                                                                                className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                            >
                                                                                                <option value="ACTIVITY">Activity</option>
                                                                                                <option value="FOOD">Food</option>
                                                                                                <option value="LODGING">Lodging</option>
                                                                                                <option value="FLIGHT">Flight</option>
                                                                                            </select>
                                                                                            <button
                                                                                                type="submit"
                                                                                                disabled={isUpdatingActivity}
                                                                                                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                            >
                                                                                                {isUpdatingActivity ? 'Saving...' : 'Save'}
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={cancelEditActivity}
                                                                                                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                            >
                                                                                                Cancel
                                                                                            </button>
                                                                                        </div>
                                                                                    </form>
                                                                                ) : (
                                                                                    <>
                                                                                        <div className="relative z-10 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                                                                                            {renderActivityIcon(activity.type)}
                                                                                        </div>
                                                                                        <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                                                            <span className="inline-flex rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                                                                                {activity.time}
                                                                                            </span>
                                                                                            <p className="mt-1 text-sm font-medium text-slate-800">{activity.title}</p>
                                                                                        </div>
                                                                                        {canManage && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => startEditActivity(day.id, activity)}
                                                                                                    className="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                                >
                                                                                                    Edit
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleDeleteActivity(day.id, activity.id)}
                                                                                                    disabled={isDeletingActivityId === activity.id}
                                                                                                    className="inline-flex items-center rounded-lg border border-red-300 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                                >
                                                                                                    {isDeletingActivityId === activity.id ? 'Deleting...' : 'Delete'}
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                        </div>
                                                                        {day.activities.length === 0 && (
                                                                            <p className="text-sm text-slate-500">No activities yet.</p>
                                                                        )}
                                                                    </div>
                                                                    )}
                                                                    {!collapsedDays[day.id] && canManage && (
                                                                        <div className="mt-4">
                                                                            {activityFormDayId === day.id ? (
                                                                                <form onSubmit={(e) => handleAddActivity(e, day.id)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                                        <input
                                                                                            required
                                                                                            type="time"
                                                                                            value={activityTime}
                                                                                            onChange={(e) => setActivityTime(e.target.value)}
                                                                                            className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                        />
                                                                                        <input
                                                                                            required
                                                                                            type="text"
                                                                                            value={activityTitle}
                                                                                            onChange={(e) => setActivityTitle(e.target.value)}
                                                                                            placeholder="Activity title"
                                                                                            className="sm:col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <select
                                                                                            value={activityType}
                                                                                            onChange={(e) => setActivityType(e.target.value as 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY')}
                                                                                            className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                        >
                                                                                            <option value="ACTIVITY">Activity</option>
                                                                                            <option value="FOOD">Food</option>
                                                                                            <option value="LODGING">Lodging</option>
                                                                                            <option value="FLIGHT">Flight</option>
                                                                                        </select>
                                                                                        <button
                                                                                            type="submit"
                                                                                            disabled={isSavingActivity}
                                                                                            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                        >
                                                                                            {isSavingActivity ? 'Adding...' : 'Add activity'}
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={cancelAddActivity}
                                                                                            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                    </div>
                                                                                </form>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => startAddActivity(day.id)}
                                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                >
                                                                                    <Plus className="h-3.5 w-3.5" />
                                                                                    Add activity
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {day.tags.length > 0 && (
                                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                                            {day.tags.map((tag) => (
                                                                                <span
                                                                                    key={`${day.id}-${tag}`}
                                                                                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                                                                >
                                                                                    {tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'explore' && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                    <MapPin className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Coming Soon</h3>
                                <p className="text-slate-500 max-w-sm">
                                    The explore feature is currently being developed for the next version of Wanderly.
                                </p>
                            </div>
                        )}

                        {activeTab === 'budget' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Trip Budget</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Track pre-trip estimates to understand the total expected cost.
                                        </p>
                                    </div>
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddBudgetForm((prev) => !prev)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            {showAddBudgetForm ? 'Cancel' : 'Add estimate'}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Total estimate</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{formatCurrency(totalBudgetCents)}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Per person</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{formatCurrency(totalBudgetPerPersonCents)}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Categories</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{budgetItemsByCategory.length}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Line items</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{budgetItems.length}</p>
                                    </div>
                                </div>

                                {budgetError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {budgetError}
                                    </div>
                                )}

                                {showAddBudgetForm && canManage && (
                                    <form onSubmit={handleAddBudgetItem} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-2">
                                                <label htmlFor="budget-title" className="block text-sm font-medium text-slate-700">What cost do you expect?</label>
                                                <input
                                                    id="budget-title"
                                                    type="text"
                                                    required
                                                    value={budgetTitle}
                                                    onChange={(e) => setBudgetTitle(e.target.value)}
                                                    placeholder="e.g. Flights to Tokyo"
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="budget-category" className="block text-sm font-medium text-slate-700">Category</label>
                                                <select
                                                    id="budget-category"
                                                    value={budgetCategory}
                                                    onChange={(e) => setBudgetCategory(e.target.value as (typeof BUDGET_CATEGORIES)[number]['value'])}
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                >
                                                    {BUDGET_CATEGORIES.map((entry) => (
                                                        <option key={entry.value} value={entry.value}>{entry.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label htmlFor="budget-amount" className="block text-sm font-medium text-slate-700">Estimated cost (EUR)</label>
                                                <input
                                                    id="budget-amount"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    required
                                                    value={budgetEstimatedCost}
                                                    onChange={(e) => setBudgetEstimatedCost(e.target.value)}
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="budget-pricing-mode" className="block text-sm font-medium text-slate-700">Cost type</label>
                                                <select
                                                    id="budget-pricing-mode"
                                                    value={budgetPricingMode}
                                                    onChange={(e) => setBudgetPricingMode(e.target.value as (typeof BUDGET_PRICING_MODES)[number]['value'])}
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                >
                                                    {BUDGET_PRICING_MODES.map((entry) => (
                                                        <option key={entry.value} value={entry.value}>{entry.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="budget-people-count" className="block text-sm font-medium text-slate-700">For how many people?</label>
                                                <input
                                                    id="budget-people-count"
                                                    type="number"
                                                    min={1}
                                                    max={1000}
                                                    required
                                                    value={budgetPeopleCount}
                                                    onChange={(e) => setBudgetPeopleCount(Number(e.target.value))}
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="budget-day-start" className="block text-sm font-medium text-slate-700">From travel day</label>
                                                <input
                                                    id="budget-day-start"
                                                    type="number"
                                                    min={1}
                                                    value={budgetDayStart}
                                                    onChange={(e) => setBudgetDayStart(e.target.value)}
                                                    placeholder="optional"
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="budget-day-end" className="block text-sm font-medium text-slate-700">To travel day</label>
                                                <input
                                                    id="budget-day-end"
                                                    type="number"
                                                    min={1}
                                                    value={budgetDayEnd}
                                                    onChange={(e) => setBudgetDayEnd(e.target.value)}
                                                    placeholder="optional"
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                {budgetPricingMode === 'PER_PERSON'
                                                    ? 'The entered amount is interpreted as price per person.'
                                                    : 'The entered amount is interpreted as total for the whole group.'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="sm:col-span-3">
                                                <label htmlFor="budget-notes" className="block text-sm font-medium text-slate-700">Notes</label>
                                                <input
                                                    id="budget-notes"
                                                    type="text"
                                                    value={budgetNotes}
                                                    onChange={(e) => setBudgetNotes(e.target.value)}
                                                    placeholder="Optional details"
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSavingBudget}
                                            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isSavingBudget ? 'Saving...' : 'Save estimate'}
                                        </button>
                                    </form>
                                )}

                                {budgetItems.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <h3 className="text-lg font-semibold text-slate-800">No estimates yet</h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {canManage
                                                ? 'Add estimated expenses to get an early budget indication.'
                                                : 'The owner has not added any budget estimates yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {groupedBudgetItems.map((group) => {
                                            const isCollapsed = collapsedBudgetCategories[group.category] ?? false;

                                            return (
                                                <div key={group.category} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBudgetCategory(group.category)}
                                                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">{formatBudgetCategory(group.category)}</p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {group.items.length} item(s) • {formatCurrency(group.perPersonCents)}/person • {formatCurrency(group.totalCents)}
                                                            </p>
                                                        </div>
                                                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                        </span>
                                                    </button>

                                                    {!isCollapsed && (
                                                        <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                                                            {group.items.map((item) => (
                                                                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                {editingBudgetId === item.id && canManage ? (
                                                    <form onSubmit={(e) => handleUpdateBudgetItem(e, item.id)} className="space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="sm:col-span-2">
                                                                <label htmlFor={`edit-budget-title-${item.id}`} className="block text-sm font-medium text-slate-700">What cost do you expect?</label>
                                                                <input
                                                                    id={`edit-budget-title-${item.id}`}
                                                                    type="text"
                                                                    required
                                                                    value={editBudgetTitle}
                                                                    onChange={(e) => setEditBudgetTitle(e.target.value)}
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`edit-budget-category-${item.id}`} className="block text-sm font-medium text-slate-700">Category</label>
                                                                <select
                                                                    id={`edit-budget-category-${item.id}`}
                                                                    value={editBudgetCategory}
                                                                    onChange={(e) => setEditBudgetCategory(e.target.value as (typeof BUDGET_CATEGORIES)[number]['value'])}
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                >
                                                                    {BUDGET_CATEGORIES.map((entry) => (
                                                                        <option key={entry.value} value={entry.value}>{entry.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div>
                                                                <label htmlFor={`edit-budget-amount-${item.id}`} className="block text-sm font-medium text-slate-700">Estimated cost (EUR)</label>
                                                                <input
                                                                    id={`edit-budget-amount-${item.id}`}
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    required
                                                                    value={editBudgetEstimatedCost}
                                                                    onChange={(e) => setEditBudgetEstimatedCost(e.target.value)}
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`edit-budget-pricing-mode-${item.id}`} className="block text-sm font-medium text-slate-700">Cost type</label>
                                                                <select
                                                                    id={`edit-budget-pricing-mode-${item.id}`}
                                                                    value={editBudgetPricingMode}
                                                                    onChange={(e) => setEditBudgetPricingMode(e.target.value as (typeof BUDGET_PRICING_MODES)[number]['value'])}
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                >
                                                                    {BUDGET_PRICING_MODES.map((entry) => (
                                                                        <option key={entry.value} value={entry.value}>{entry.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`edit-budget-people-count-${item.id}`} className="block text-sm font-medium text-slate-700">For how many people?</label>
                                                                <input
                                                                    id={`edit-budget-people-count-${item.id}`}
                                                                    type="number"
                                                                    min={1}
                                                                    max={1000}
                                                                    required
                                                                    value={editBudgetPeopleCount}
                                                                    onChange={(e) => setEditBudgetPeopleCount(Number(e.target.value))}
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label htmlFor={`edit-budget-day-start-${item.id}`} className="block text-sm font-medium text-slate-700">From travel day</label>
                                                                <input
                                                                    id={`edit-budget-day-start-${item.id}`}
                                                                    type="number"
                                                                    min={1}
                                                                    value={editBudgetDayStart}
                                                                    onChange={(e) => setEditBudgetDayStart(e.target.value)}
                                                                    placeholder="optional"
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`edit-budget-day-end-${item.id}`} className="block text-sm font-medium text-slate-700">To travel day</label>
                                                                <input
                                                                    id={`edit-budget-day-end-${item.id}`}
                                                                    type="number"
                                                                    min={1}
                                                                    value={editBudgetDayEnd}
                                                                    onChange={(e) => setEditBudgetDayEnd(e.target.value)}
                                                                    placeholder="optional"
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-500">
                                                                {editBudgetPricingMode === 'PER_PERSON'
                                                                    ? 'The entered amount is interpreted as price per person.'
                                                                    : 'The entered amount is interpreted as total for the whole group.'}
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="sm:col-span-3">
                                                                <label htmlFor={`edit-budget-notes-${item.id}`} className="block text-sm font-medium text-slate-700">Notes</label>
                                                                <input
                                                                    id={`edit-budget-notes-${item.id}`}
                                                                    type="text"
                                                                    value={editBudgetNotes}
                                                                    onChange={(e) => setEditBudgetNotes(e.target.value)}
                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="submit"
                                                                disabled={isUpdatingBudget}
                                                                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isUpdatingBudget ? 'Saving...' : 'Save changes'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditBudgetItem}
                                                                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                        <div>
                                                            <h3 className="text-base font-semibold text-slate-800">{item.title}</h3>
                                                            <p className="mt-1 text-sm text-slate-600">{formatBudgetCategory(item.category)}</p>
                                                            {formatBudgetDayRange(item.dayStart, item.dayEnd) && (
                                                                <p className="mt-1 text-xs font-medium text-blue-700">
                                                                    {formatBudgetDayRange(item.dayStart, item.dayEnd)}
                                                                </p>
                                                            )}
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {formatBudgetPricingMode(item.pricingMode)} for {item.peopleCount} people
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Base: {formatCurrency(item.estimatedCostCents)}
                                                                {item.pricingMode === 'PER_PERSON' ? ' per person' : ' for group'}
                                                            </p>
                                                            {item.notes && (
                                                                <p className="mt-1 text-sm text-slate-500">{item.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                                                                {formatCurrency(getBudgetItemPerPersonCents(item))}/person
                                                            </span>
                                                            <span className="inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                                                                {formatCurrency(getBudgetItemTotalCents(item))}
                                                            </span>
                                                            {canManage && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startEditBudgetItem(item)}
                                                                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteBudgetItem(item.id)}
                                                                        disabled={isDeletingBudgetId === item.id}
                                                                        className="inline-flex items-center rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        {isDeletingBudgetId === item.id ? 'Deleting...' : 'Delete'}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
