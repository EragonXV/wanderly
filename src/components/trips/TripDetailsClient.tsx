'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { UserAvatar } from '@/components/ui/UserAvatar';
import TripChatPanel from '@/components/trips/TripChatPanel';
import {
    ArrowLeft, Calendar, MapPin, Users, Settings, Plus,
    Calculator, Map, Camera, Utensils, ChevronDown, ChevronRight, FileText, UserRoundPlus, Car, Plane, House, Trash2, MessageCircle, Pencil
} from 'lucide-react';
import { format } from 'date-fns';

type Collaborator = {
    id: string;
    name: string;
    image: string | null;
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
    chatMessages: {
        id: string;
        type: 'USER' | 'SYSTEM';
        content: string;
        createdAt: string;
        user: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
        } | null;
    }[];
};

type Props = {
    trip: TripDetails;
    currentUserId: string;
    canManage: boolean;
    canManageParticipants: boolean;
    canManageTripSettings: boolean;
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
type ItineraryTimelineItem =
    | { kind: 'planned'; block: ItineraryBlock }
    | { kind: 'missing'; start: number; end: number };
type PlaceSuggestion = {
    placeId: string;
    name: string;
    displayName: string;
    lat: number;
    lng: number;
};

type TripTab = 'overview' | 'itinerary' | 'explore' | 'budget' | 'chat';

const BUDGET_CATEGORIES = [
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'ACCOMMODATION', label: 'Unterkunft' },
    { value: 'FOOD', label: 'Verpflegung' },
    { value: 'ACTIVITIES', label: 'Aktivitäten' },
    { value: 'INSURANCE', label: 'Versicherung' },
    { value: 'OTHER', label: 'Sonstiges' },
] as const;

const BUDGET_PRICING_MODES = [
    { value: 'GROUP_TOTAL', label: 'Für Gruppe' },
    { value: 'PER_PERSON', label: 'Pro Person' },
] as const;

const BUDGET_CHART_COLORS = ['#2563EB', '#DC2626', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#4B5563'];

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
    }).format(cents / 100);

const formatBudgetCategory = (category: string) =>
    BUDGET_CATEGORIES.find((entry) => entry.value === category)?.label || category;

const getBudgetCategoryChartColor = (category: string) => {
    const categoryIndex = BUDGET_CATEGORIES.findIndex((entry) => entry.value === category);
    const normalizedIndex = categoryIndex >= 0 ? categoryIndex : BUDGET_CATEGORIES.length - 1;
    return BUDGET_CHART_COLORS[normalizedIndex % BUDGET_CHART_COLORS.length];
};

const getBudgetCategoryIcon = (category: string) => {
    switch (category) {
        case 'TRANSPORT':
            return { Icon: Car, className: 'text-sky-600' };
        case 'ACCOMMODATION':
            return { Icon: House, className: 'text-indigo-600' };
        case 'FOOD':
            return { Icon: Utensils, className: 'text-emerald-600' };
        case 'ACTIVITIES':
            return { Icon: Camera, className: 'text-violet-600' };
        case 'INSURANCE':
            return { Icon: UserRoundPlus, className: 'text-amber-600' };
        default:
            return { Icon: Plane, className: 'text-slate-500' };
    }
};

const formatTripTimeframe = (trip: Pick<TripDetails, 'timeMode' | 'startDate' | 'endDate' | 'planningStartDate' | 'planningEndDate' | 'plannedDurationDays'>) => {
    if (trip.timeMode === 'FLEXIBLE') {
        const planningStart = trip.planningStartDate ? new Date(trip.planningStartDate) : null;
        const planningEnd = trip.planningEndDate ? new Date(trip.planningEndDate) : null;
        const rangeLabel =
            planningStart && planningEnd
                ? `${format(planningStart, 'MMM d')} - ${format(planningEnd, 'MMM d, yyyy')}`
                : `${format(new Date(trip.startDate), 'MMM d')} - ${format(new Date(trip.endDate), 'MMM d, yyyy')}`;
        const durationLabel = `${trip.plannedDurationDays ?? 1} day${trip.plannedDurationDays === 1 ? '' : 's'}`;
        return `${rangeLabel} (${durationLabel})`;
    }

    return `${format(new Date(trip.startDate), 'MMM d')} - ${format(new Date(trip.endDate), 'MMM d, yyyy')}`;
};

const formatKnownPlannedParticipants = (
    trip: Pick<TripDetails, 'participantMode' | 'participantFixedCount' | 'participantMinCount' | 'participantMaxCount'>
) => {
    if (trip.participantMode === 'FIXED' && trip.participantFixedCount != null) {
        return `${trip.participantFixedCount}`;
    }
    if (trip.participantMode === 'RANGE' && trip.participantMinCount != null && trip.participantMaxCount != null) {
        return `${trip.participantMinCount}-${trip.participantMaxCount}`;
    }
    return null;
};

const getBudgetItemTotalCents = (item: BudgetItem) =>
    item.pricingMode === 'PER_PERSON'
        ? item.estimatedCostCents * item.peopleCount
        : item.estimatedCostCents;

const getBudgetItemPerPersonCents = (item: BudgetItem) =>
    item.pricingMode === 'PER_PERSON'
        ? item.estimatedCostCents
        : Math.round(item.estimatedCostCents / Math.max(1, item.peopleCount));

type BudgetWarningInput = {
    pricingMode: 'PER_PERSON' | 'GROUP_TOTAL';
    peopleCount: number;
    dayStart: number | null;
    dayEnd: number | null;
    estimatedCostCents: number;
};

type BudgetWarningLevel = 'high' | 'medium' | 'low';

type BudgetWarningEntry = {
    level: BudgetWarningLevel;
    message: string;
};

type ExploreLocationPoint = {
    location: string;
    displayName: string;
    lat: number;
    lng: number;
};

type ExploreMapPoint = {
    location: string;
    dayNumber: number;
    lat: number;
    lng: number;
};

const TripExploreMap = dynamic(
    () => import('@/components/trips/TripExploreMap').then((mod) => mod.TripExploreMap),
    { ssr: false }
);

const getBudgetWarningEntries = ({
    pricingMode,
    peopleCount,
    dayStart,
    dayEnd,
    estimatedCostCents,
}: BudgetWarningInput) => {
    const warnings: BudgetWarningEntry[] = [];

    if (dayStart != null && dayEnd != null && dayEnd < dayStart) {
        warnings.push({ level: 'high', message: 'Tag-Ende liegt vor Tag-Start.' });
    }

    if (estimatedCostCents <= 0) {
        warnings.push({ level: 'high', message: 'Kosten sind 0 oder kleiner.' });
    }

    if (pricingMode === 'PER_PERSON' && peopleCount <= 1) {
        warnings.push({ level: 'medium', message: 'Kostenart "Pro Person" mit nur 1 Person wirkt unplausibel.' });
    }

    if (pricingMode === 'GROUP_TOTAL' && peopleCount <= 1) {
        warnings.push({ level: 'low', message: 'Kostenart "Für Gruppe" mit nur 1 Person prüfen.' });
    }

    return warnings;
};

const getBudgetWarnings = (input: BudgetWarningInput) => getBudgetWarningEntries(input).map((warning) => warning.message);

export default function TripDetailsClient({
    trip,
    currentUserId,
    canManage,
    canManageParticipants,
    canManageTripSettings,
    canViewParticipants,
    initialTab = 'overview',
}: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const getTabFromPathname = (currentPathname: string | null): TripTab => {
        if (!currentPathname) {
            return initialTab;
        }

        const parts = currentPathname.split('/').filter(Boolean);
        const lastSegment = parts[parts.length - 1];
        if (lastSegment === 'itinerary' || lastSegment === 'explore' || lastSegment === 'budget' || lastSegment === 'chat') {
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
    const [locationPlaceId, setLocationPlaceId] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isLoadingLocationSuggestions, setIsLoadingLocationSuggestions] = useState(false);
    const [locationSuggestionError, setLocationSuggestionError] = useState('');
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
    const [editLocationPlaceId, setEditLocationPlaceId] = useState('');
    const [editLocationSuggestions, setEditLocationSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isLoadingEditLocationSuggestions, setIsLoadingEditLocationSuggestions] = useState(false);
    const [editLocationSuggestionError, setEditLocationSuggestionError] = useState('');
    const [isEditLocationDirty, setIsEditLocationDirty] = useState(false);
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
    const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        trip.itineraryDays.forEach((day) => {
            initial[day.id] = true;
        });
        return initial;
    });
    const [collapsedBudgetCategories, setCollapsedBudgetCategories] = useState<Record<string, boolean>>({});
    const [expandedBudgetNotes, setExpandedBudgetNotes] = useState<Record<string, boolean>>({});
    const [isItineraryEditMode, setIsItineraryEditMode] = useState(false);
    const [itineraryError, setItineraryError] = useState('');
    const [budgetError, setBudgetError] = useState('');
    const [explorePoints, setExplorePoints] = useState<ExploreLocationPoint[]>([]);
    const [isLoadingExplorePoints, setIsLoadingExplorePoints] = useState(false);
    const [exploreError, setExploreError] = useState('');
    const canEditItinerary = canManage && isItineraryEditMode;
    const canEditBudget = canManage;
    const isAnyModalOpen =
        showAddBudgetForm ||
        showAddDayForm ||
        editingDayId !== null ||
        activityFormDayId !== null ||
        editingActivityId !== null;

    const parseOptionalDayNumber = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : null;
    };

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

    useEffect(() => {
        setCollapsedDays((prev) => {
            const next: Record<string, boolean> = {};
            itineraryDays.forEach((day) => {
                next[day.id] = prev[day.id] ?? true;
            });
            return next;
        });
    }, [itineraryDays]);

    useEffect(() => {
        if (canManage) {
            return;
        }
        setIsItineraryEditMode(false);
        setShowAddBudgetForm(false);
        setEditingBudgetId(null);
        setBudgetError('');
    }, [canManage]);

    useEffect(() => {
        if (isItineraryEditMode) {
            return;
        }
        setShowAddDayForm(false);
        setEditingDayId(null);
        setEditingBlockDayIds([]);
        setEditingBlockLength(1);
        setEditDayNumber(1);
        setEditSummary('');
        setEditLocation('');
        setEditTagsInput('');
        setActivityFormDayId(null);
        setActivityTime('');
        setActivityTitle('');
        setActivityType('ACTIVITY');
        setEditingActivityDayId(null);
        setEditingActivityId(null);
        setEditActivityTime('');
        setEditActivityTitle('');
        setEditActivityType('ACTIVITY');
        setLocationSuggestions([]);
        setLocationPlaceId('');
        setLocationSuggestionError('');
        setEditLocationSuggestions([]);
        setEditLocationPlaceId('');
        setEditLocationSuggestionError('');
        setIsEditLocationDirty(false);
        setItineraryError('');
    }, [isItineraryEditMode]);

    useEffect(() => {
        if (locationPlaceId) {
            setLocationSuggestions([]);
            setIsLoadingLocationSuggestions(false);
            return;
        }

        const query = location.trim();
        if (query.length < 2 || !showAddDayForm || !canEditItinerary) {
            setLocationSuggestions([]);
            setIsLoadingLocationSuggestions(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setIsLoadingLocationSuggestions(true);
                setLocationSuggestionError('');
                const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) {
                    setLocationSuggestionError(data.message || 'Ortsvorschläge konnten nicht geladen werden.');
                    return;
                }
                setLocationSuggestions(Array.isArray(data.places) ? data.places : []);
            } catch {
                if (!controller.signal.aborted) {
                    setLocationSuggestionError('Ortsvorschläge konnten nicht geladen werden.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingLocationSuggestions(false);
                }
            }
        }, 250);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [location, locationPlaceId, showAddDayForm, canEditItinerary]);

    useEffect(() => {
        if (editLocationPlaceId) {
            setEditLocationSuggestions([]);
            setIsLoadingEditLocationSuggestions(false);
            return;
        }

        const query = editLocation.trim();
        if (query.length < 2 || !editingDayId || !canEditItinerary || !isEditLocationDirty) {
            setEditLocationSuggestions([]);
            setIsLoadingEditLocationSuggestions(false);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                setIsLoadingEditLocationSuggestions(true);
                setEditLocationSuggestionError('');
                const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) {
                    setEditLocationSuggestionError(data.message || 'Ortsvorschläge konnten nicht geladen werden.');
                    return;
                }
                setEditLocationSuggestions(Array.isArray(data.places) ? data.places : []);
            } catch {
                if (!controller.signal.aborted) {
                    setEditLocationSuggestionError('Ortsvorschläge konnten nicht geladen werden.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingEditLocationSuggestions(false);
                }
            }
        }, 250);

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [editLocation, editLocationPlaceId, editingDayId, canEditItinerary, isEditLocationDirty]);

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

    const exploreLocations = useMemo(() => {
        const seen = new Set<string>();
        const ordered: string[] = [];
        sortedItinerary.forEach((day) => {
            const value = day.location.trim();
            if (!value) {
                return;
            }
            const key = value.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                ordered.push(value);
            }
        });
        return ordered;
    }, [sortedItinerary]);

    const exploreOrderedStops = useMemo(() => {
        const seen = new Set<string>();
        return sortedItinerary
            .map((day) => ({
                dayNumber: day.dayNumber,
                location: day.location.trim(),
            }))
            .filter((entry) => entry.location.length > 0)
            .filter((entry) => {
                const key = entry.location.toLowerCase();
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
    }, [sortedItinerary]);

    useEffect(() => {
        if (activeTab !== 'explore') {
            return;
        }
        if (exploreLocations.length === 0) {
            setExplorePoints([]);
            setExploreError('');
            setIsLoadingExplorePoints(false);
            return;
        }

        let cancelled = false;
        const controller = new AbortController();

        const loadExplorePoints = async () => {
            setIsLoadingExplorePoints(true);
            setExploreError('');

            try {
                const responses = await Promise.all(
                    exploreLocations.map(async (location) => {
                        const response = await fetch(`/api/places/search?q=${encodeURIComponent(location)}`, {
                            signal: controller.signal,
                        });
                        const data = await response.json();
                        if (!response.ok) {
                            throw new Error(data.message || 'Orte konnten nicht geladen werden.');
                        }
                        const places = Array.isArray(data.places) ? (data.places as PlaceSuggestion[]) : [];
                        const first = places[0];
                        if (!first) {
                            return null;
                        }
                        return {
                            location,
                            displayName: first.displayName,
                            lat: first.lat,
                            lng: first.lng,
                        } as ExploreLocationPoint;
                    })
                );

                if (cancelled) {
                    return;
                }

                setExplorePoints(
                    responses.filter((entry): entry is ExploreLocationPoint => Boolean(entry))
                );
            } catch {
                if (cancelled || controller.signal.aborted) {
                    return;
                }
                setExploreError('Karte konnte nicht geladen werden.');
                setExplorePoints([]);
            } finally {
                if (!cancelled) {
                    setIsLoadingExplorePoints(false);
                }
            }
        };

        void loadExplorePoints();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [activeTab, exploreLocations]);

    const exploreMapPoints = useMemo(() => {
        const pointByLocation = new globalThis.Map(
            explorePoints.map((point) => [point.location.toLowerCase(), point] as const)
        );
        return exploreOrderedStops
            .map((stop) => {
                const point = pointByLocation.get(stop.location.toLowerCase());
                if (!point) {
                    return null;
                }
                return {
                    location: stop.location,
                    dayNumber: stop.dayNumber,
                    lat: point.lat,
                    lng: point.lng,
                };
            })
            .filter((entry): entry is ExploreMapPoint => Boolean(entry));
    }, [explorePoints, exploreOrderedStops]);

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

    const budgetCategoryChartData = useMemo(() => {
        if (budgetItemsByCategory.length === 0 || totalBudgetCents <= 0) {
            return [];
        }
        return budgetItemsByCategory.map((entry, index) => ({
            ...entry,
            sharePercent: Math.max(1, Math.round((entry.totalCents / totalBudgetCents) * 100)),
            color: getBudgetCategoryChartColor(entry.category),
        }));
    }, [budgetItemsByCategory, totalBudgetCents]);
    const budgetPieGradient = useMemo(() => {
        if (budgetCategoryChartData.length === 0) {
            return '';
        }
        let current = 0;
        const stops = budgetCategoryChartData.map((entry) => {
            const start = current;
            const end = Math.min(100, current + entry.sharePercent);
            current = end;
            return `${entry.color} ${start}% ${end}%`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    }, [budgetCategoryChartData]);

    const addBudgetWarnings = useMemo(
        () =>
            getBudgetWarnings({
                pricingMode: budgetPricingMode,
                peopleCount: budgetPeopleCount,
                dayStart: parseOptionalDayNumber(budgetDayStart),
                dayEnd: parseOptionalDayNumber(budgetDayEnd),
                estimatedCostCents: Math.round((Number(budgetEstimatedCost) || 0) * 100),
            }),
        [budgetPricingMode, budgetPeopleCount, budgetDayStart, budgetDayEnd, budgetEstimatedCost]
    );

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

    const itineraryTimelineItems = useMemo(() => {
        const items: ItineraryTimelineItem[] = [];
        if (groupedItinerary.length === 0) {
            return items;
        }

        let cursor = 1;
        groupedItinerary.forEach((block) => {
            if (block.start > cursor) {
                items.push({
                    kind: 'missing',
                    start: cursor,
                    end: block.start - 1,
                });
            }
            items.push({
                kind: 'planned',
                block,
            });
            cursor = block.end + 1;
        });

        if (cursor <= tripDurationDays) {
            items.push({
                kind: 'missing',
                start: cursor,
                end: tripDurationDays,
            });
        }

        return items;
    }, [groupedItinerary, tripDurationDays]);

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

    const toggleBudgetNotes = (itemId: string) => {
        setExpandedBudgetNotes((prev) => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    const handleAddDay = async (e: FormEvent) => {
        e.preventDefault();
        if (!canEditItinerary) {
            return;
        }
        if (!locationPlaceId) {
            setItineraryError('Bitte wähle einen realen Ort aus den Vorschlägen aus.');
            return;
        }
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
            setLocationPlaceId('');
            setLocationSuggestions([]);
            setLocationSuggestionError('');
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

    const planMissingDays = (start: number, end: number) => {
        if (!canEditItinerary) {
            return;
        }
        setDayNumber(start);
        setBlockLength(Math.max(1, end - start + 1));
        setLocation('');
        setLocationPlaceId('');
        setLocationSuggestions([]);
        setLocationSuggestionError('');
        setSummary('');
        setTagsInput('');
        setShowAddDayForm(true);
    };

    const cancelAddDay = () => {
        setShowAddDayForm(false);
        setSummary('');
        setLocation('');
        setLocationPlaceId('');
        setLocationSuggestions([]);
        setLocationSuggestionError('');
        setTagsInput('');
        setBlockLength(1);
    };

    const startEditDay = (dayId: string, block?: ItineraryBlock) => {
        if (!canEditItinerary) {
            return;
        }
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
        setEditLocationPlaceId('existing');
        setEditLocationSuggestions([]);
        setEditLocationSuggestionError('');
        setIsEditLocationDirty(false);
        setEditTagsInput(day.tags.join(', '));
    };

    const cancelEditDay = () => {
        setEditingDayId(null);
        setEditingBlockDayIds([]);
        setEditingBlockLength(1);
        setEditDayNumber(1);
        setEditSummary('');
        setEditLocation('');
        setEditLocationPlaceId('');
        setEditLocationSuggestions([]);
        setEditLocationSuggestionError('');
        setIsEditLocationDirty(false);
        setEditTagsInput('');
        setItineraryError('');
    };

    const startAddActivity = (dayId: string) => {
        if (!canEditItinerary) {
            return;
        }
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
        if (!canEditItinerary) {
            return;
        }
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
        if (!canEditItinerary) {
            return;
        }
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
        if (!canEditItinerary) {
            return;
        }
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
        if (!canEditItinerary) {
            return;
        }
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
        if (!canEditItinerary) {
            return;
        }
        if (!editingDayId) {
            return;
        }
        if (isEditLocationDirty && !editLocationPlaceId) {
            setItineraryError('Bitte wähle einen realen Ort aus den Vorschlägen aus.');
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
        if (!canEditItinerary) {
            return;
        }
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
        if (!canEditBudget) {
            return;
        }
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
        if (!canEditBudget) {
            return;
        }
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
                setBudgetError(data.message || 'Budget-Eintrag konnte nicht hinzugefügt werden.');
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
            setBudgetError('Budget-Eintrag konnte nicht hinzugefügt werden.');
        } finally {
            setIsSavingBudget(false);
        }
    };

    const handleUpdateBudgetItem = async (e: FormEvent, itemId: string) => {
        e.preventDefault();
        if (!canEditBudget) {
            return;
        }
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
                setBudgetError(data.message || 'Budget-Eintrag konnte nicht aktualisiert werden.');
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
            setBudgetError('Budget-Eintrag konnte nicht aktualisiert werden.');
        } finally {
            setIsUpdatingBudget(false);
        }
    };

    const handleDeleteBudgetItem = async (itemId: string) => {
        if (!canEditBudget) {
            return;
        }
        const confirmed = window.confirm('Diesen Budget-Eintrag löschen?');
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
                setBudgetError(data.message || 'Budget-Eintrag konnte nicht gelöscht werden.');
                return;
            }

            setBudgetItems((prev) => prev.filter((item) => item.id !== itemId));
            if (editingBudgetId === itemId) {
                cancelEditBudgetItem();
            }
        } catch {
            setBudgetError('Budget-Eintrag konnte nicht gelöscht werden.');
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
                        {canManageTripSettings && (
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
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                    {trip.category}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                    {trip.timeMode === 'FLEXIBLE' ? 'Flexible' : 'Fixed'}
                                </span>
                                {formatKnownPlannedParticipants(trip) && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                                        <UserRoundPlus className="h-3.5 w-3.5" />
                                        {formatKnownPlannedParticipants(trip)}
                                    </span>
                                )}
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

                        <div
                            className={`flex items-center -space-x-2 transition-all ${
                                isAnyModalOpen ? 'pointer-events-none opacity-0 blur-sm' : 'opacity-100'
                            }`}
                        >
                            {trip.collaborators.map((user) => (
                                <UserAvatar
                                    key={user.id}
                                    name={user.name}
                                    image={user.image}
                                    sizeClassName="h-8 w-8"
                                    textClassName="text-xs"
                                    className="border border-slate-900/80 shadow-sm align-middle"
                                />
                            ))}
                            {canViewParticipants ? (
                                <Link
                                    href={`/trip/${trip.id}/settings/participants`}
                                    className="h-8 w-8 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold hover:bg-white/30 transition-colors cursor-pointer shadow-sm"
                                    title={canManageParticipants ? 'Manage participants' : 'View participants'}
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
                                <FileText className="h-4 w-4" />
                                Übersicht
                            </button>
                            <div className="flex-shrink-0 px-4 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Reise
                            </div>
                            <button
                                onClick={() => navigateToTab('itinerary')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'itinerary' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Map className="h-4 w-4" />
                                Planung
                            </button>
                            <button
                                onClick={() => navigateToTab('explore')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'explore' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <MapPin className="h-4 w-4" />
                                Reise Route
                            </button>
                            <div className="flex-shrink-0 px-4 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Finanzen
                            </div>
                            <button
                                onClick={() => navigateToTab('budget')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'budget' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Calculator className="h-4 w-4" />
                                Budget
                            </button>
                            <button
                                onClick={() => navigateToTab('chat')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'chat' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <MessageCircle className="h-4 w-4" />
                                Chat
                            </button>
                        </nav>
                    </div>

                    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-white">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Reiseübersicht</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Beschreibung, Planungsstand und Budget-Snapshot auf einen Blick.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Beschreibung</p>
                                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                                        {trip.description?.trim()
                                            ? trip.description
                                            : 'Noch keine Beschreibung vorhanden. Der Besitzer kann sie in den Reiseeinstellungen ergänzen.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => navigateToTab('itinerary')}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:bg-slate-50"
                                        aria-label="Planungsdetails öffnen"
                                    >
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Planungs-Snapshot</h3>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
                                                {itineraryDays.length} von {tripDurationDays} Tagen geplant
                                            </span>
                                        </div>
                                        {groupedItinerary.length === 0 ? (
                                            <p className="mt-3 text-sm text-slate-500">Es wurden noch keine Reisetage hinzugefügt.</p>
                                        ) : (
                                            <div className="mt-4">
                                                {groupedItinerary.slice(0, 6).map((block, index) => {
                                                    const representativeDay = block.days[0];
                                                    const blockLabel =
                                                        block.days.length > 1
                                                            ? `Tage ${block.start}-${block.end}`
                                                            : `Tag ${block.start}`;
                                                    const isLastVisible = index === Math.min(groupedItinerary.length, 6) - 1;

                                                    return (
                                                    <div key={block.id} className="relative pl-8 pb-4">
                                                        {!isLastVisible && (
                                                            <span
                                                                className="absolute top-4 -bottom-4 w-px bg-slate-200"
                                                                style={{ left: '13px' }}
                                                            />
                                                        )}
                                                        <span className="absolute left-[7px] top-2.5 h-3 w-3 rounded-full border-2 border-blue-200 bg-blue-500" />
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                            <div className="grid grid-cols-[208px_minmax(0,1fr)] items-center gap-2">
                                                                <p className="truncate text-sm font-semibold text-slate-800">{blockLabel}</p>
                                                                <span className="inline-flex min-w-0 items-center gap-1 text-xs text-slate-600">
                                                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                                    <span className="min-w-0 truncate">{representativeDay.location}</span>
                                                                </span>
                                                            </div>
                                                            {representativeDay.summary?.trim().length > 0 && (
                                                                <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                                                                    {representativeDay.summary}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                                {groupedItinerary.length > 6 && (
                                                    <p className="pl-8 text-xs text-slate-500">
                                                        +{groupedItinerary.length - 6} weitere Blöcke. Öffne Planung für alle Details.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => navigateToTab('budget')}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:bg-slate-50"
                                        aria-label="Budget-Details öffnen"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Budget-Snapshot</h3>
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Gesamtschätzung</p>
                                                <p className="mt-1 text-base font-semibold text-slate-800">{formatCurrency(totalBudgetCents)}</p>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Pro Person</p>
                                                <p className="mt-1 text-base font-semibold text-slate-800">{formatCurrency(totalBudgetPerPersonCents)}</p>
                                            </div>
                                        </div>
                                        {budgetCategoryChartData.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs uppercase tracking-wide text-slate-500">Kostenverteilung nach Kategorie</p>
                                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-start">
                                                    <div className="flex justify-center sm:justify-start">
                                                        <div
                                                            className="relative h-28 w-28 rounded-full border border-slate-200"
                                                            style={{ background: budgetPieGradient }}
                                                        >
                                                            <div className="absolute inset-4 rounded-full bg-white" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {budgetCategoryChartData.slice(0, 5).map((entry) => (
                                                            <div key={entry.category} className="flex items-center justify-between gap-2 text-xs">
                                                                <span className="inline-flex min-w-0 items-center gap-2">
                                                                    <span
                                                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                                        style={{ backgroundColor: entry.color }}
                                                                    />
                                                                    <span className="truncate font-medium text-slate-700">
                                                                        {formatBudgetCategory(entry.category)}
                                                                    </span>
                                                                </span>
                                                                <span className="shrink-0 text-slate-600">
                                                                    {entry.sharePercent}% • {formatCurrency(entry.totalCents)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'itinerary' && (
                            <div
                                className={`space-y-8 rounded-2xl p-3 sm:p-4 transition-colors ${
                                    isItineraryEditMode ? 'bg-blue-50/60 ring-1 ring-blue-100' : 'bg-transparent'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-bold text-slate-800">Reiseplanung</h2>
                                        <p className="text-sm text-slate-500">
                                            Geplante Tage: {itineraryDays.length}/{tripDurationDays}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {sortedItinerary.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={toggleAllDays}
                                                className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                {areAllDaysCollapsed ? 'Alle Tage ausklappen' : 'Alle Tage einklappen'}
                                            </button>
                                        )}
                                        {canEditItinerary && (
                                            <button
                                                onClick={() => setShowAddDayForm((prev) => !prev)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                                            >
                                                <Plus className="h-4 w-4" />
                                                <span className="hidden sm:inline">{showAddDayForm ? 'Abbrechen' : 'Tag hinzufügen'}</span>
                                            </button>
                                        )}
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => setIsItineraryEditMode((prev) => !prev)}
                                                className={`inline-flex min-w-[200px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                                    isItineraryEditMode
                                                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                                                        : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                                }`}
                                            >
                                                {isItineraryEditMode ? 'Bearbeitungsmodus aktiv' : 'Bearbeitungsmodus'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {itineraryError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {itineraryError}
                                    </div>
                                )}

                                {showAddDayForm && canEditItinerary && (
                                    <div
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
                                        onClick={cancelAddDay}
                                    >
                                        <form
                                            id="add-day-form"
                                            onSubmit={handleAddDay}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xl"
                                        >
                                            <h3 className="text-lg font-semibold text-slate-800">Tag hinzufügen</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="day-number" className="block text-sm font-medium text-slate-700">
                                                        Starttag
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
                                                        Anzahl der Tage (Block)
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
                                                        Wo verbringst du den Tag?
                                                    </label>
                                                    <input
                                                        id="day-location"
                                                        type="text"
                                                        required
                                                        value={location}
                                                        onChange={(e) => {
                                                            setLocation(e.target.value);
                                                            setLocationPlaceId('');
                                                        }}
                                                        placeholder="z. B. Kyoto Innenstadt"
                                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    />
                                                    {isLoadingLocationSuggestions && (
                                                        <p className="mt-1 text-xs text-slate-500">Suche Orte...</p>
                                                    )}
                                                    {locationSuggestionError && (
                                                        <p className="mt-1 text-xs text-red-600">{locationSuggestionError}</p>
                                                    )}
                                                    {locationSuggestions.length > 0 && (
                                                        <div className="mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                                            {locationSuggestions.map((place) => (
                                                                <button
                                                                    key={place.placeId}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setLocation(place.name);
                                                                        setLocationPlaceId(place.placeId);
                                                                        setLocationSuggestions([]);
                                                                    }}
                                                                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 last:border-b-0"
                                                                >
                                                                    <span className="font-medium text-slate-900">{place.name}</span>
                                                                    <span className="mt-0.5 block text-xs text-slate-500">{place.displayName}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {!locationPlaceId && location.trim().length > 0 && !isLoadingLocationSuggestions && (
                                                        <p className="mt-1 text-xs text-amber-600">Bitte einen Vorschlag auswählen.</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="day-summary" className="block text-sm font-medium text-slate-700">
                                                    Was ist an diesem Tag geplant? (optional)
                                                </label>
                                                <textarea
                                                    id="day-summary"
                                                    rows={3}
                                                    value={summary}
                                                    onChange={(e) => setSummary(e.target.value)}
                                                    placeholder="Schreibe 1-2 kurze Sätze..."
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
                                                    placeholder="z. B. Kultur, Essen, Spaziergang"
                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                                <p className="mt-1 text-xs text-slate-500">Tags mit Komma trennen.</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSavingDay}
                                                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isSavingDay ? 'Speichern...' : 'Tag speichern'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelAddDay}
                                                    disabled={isSavingDay}
                                                    className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Abbrechen
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {sortedItinerary.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <h3 className="text-lg font-semibold text-slate-800">Noch keine Reiseplanung</h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {canEditItinerary
                                                ? 'Starte die Planung, indem du den ersten Reisetag hinzufügst.'
                                                : 'Der Besitzer hat noch keine Reisetage hinzugefügt.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative pl-8">
                                        <div
                                            className="absolute top-1 bottom-1 w-px bg-slate-200"
                                            style={{ left: '17px' }}
                                            aria-hidden="true"
                                        />
                                        <div className="space-y-5">
                                            {itineraryTimelineItems.map((item) => {
                                                if (item.kind === 'missing') {
                                                    const missingLabel =
                                                        item.start === item.end
                                                            ? `Tag ${item.start}`
                                                            : `Tage ${item.start}-${item.end}`;
                                                    return (
                                                        <div key={`missing-${item.start}-${item.end}`} className="relative">
                                                            <div
                                                                className="absolute top-5 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-white"
                                                                style={{ left: '-21px' }}
                                                                aria-hidden="true"
                                                            />
                                                            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-5">
                                                                <h3 className="text-lg font-bold text-amber-800">{missingLabel}</h3>
                                                                <p className="mt-1 text-sm text-amber-700">
                                                                    Noch nicht geplant.
                                                                </p>
                                                                {canEditItinerary && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => planMissingDays(item.start, item.end)}
                                                                        className="mt-3 inline-flex items-center rounded-lg border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                                                                    >
                                                                        Tage ergänzen
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const block = item.block;
                                                const day = block.days[0];
                                                const blockTitle =
                                                    block.days.length > 1
                                                        ? `Tage ${block.start}-${block.end}`
                                                        : `Tag ${day.dayNumber}`;

                                                return (
                                                    <div key={block.id} className="relative">
                                                        <div
                                                            className="absolute top-5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white"
                                                            style={{ left: '-21px' }}
                                                            aria-hidden="true"
                                                        />
                                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                                            {editingDayId === day.id && canEditItinerary ? (
                                                                <div
                                                                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
                                                                    onClick={cancelEditDay}
                                                                >
                                                                    <form
                                                                        onSubmit={handleUpdateDay}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xl"
                                                                    >
                                                                        <h3 className="text-lg font-semibold text-slate-800">Tag bearbeiten</h3>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <label htmlFor={`edit-day-number-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                                    {editingBlockLength > 1 ? 'Starttag' : 'Reisetag'}
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
                                                                                    Anzahl der Tage (Block)
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
                                                                                    Wo verbringst du den Tag?
                                                                                </label>
                                                                                <input
                                                                                    id={`edit-day-location-${day.id}`}
                                                                                    type="text"
                                                                                    required
                                                                                    value={editLocation}
                                                                                    onChange={(e) => {
                                                                                        setEditLocation(e.target.value);
                                                                                        setEditLocationPlaceId('');
                                                                                        setIsEditLocationDirty(true);
                                                                                    }}
                                                                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                />
                                                                                {isLoadingEditLocationSuggestions && (
                                                                                    <p className="mt-1 text-xs text-slate-500">Suche Orte...</p>
                                                                                )}
                                                                                {editLocationSuggestionError && (
                                                                                    <p className="mt-1 text-xs text-red-600">{editLocationSuggestionError}</p>
                                                                                )}
                                                                                {editLocationSuggestions.length > 0 && (
                                                                                    <div className="mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                                                                        {editLocationSuggestions.map((place) => (
                                                                                            <button
                                                                                                key={place.placeId}
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    setEditLocation(place.name);
                                                                                                    setEditLocationPlaceId(place.placeId);
                                                                                                    setEditLocationSuggestions([]);
                                                                                                }}
                                                                                                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 last:border-b-0"
                                                                                            >
                                                                                                <span className="font-medium text-slate-900">{place.name}</span>
                                                                                                <span className="mt-0.5 block text-xs text-slate-500">{place.displayName}</span>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                                {isEditLocationDirty && !editLocationPlaceId && editLocation.trim().length > 0 && !isLoadingEditLocationSuggestions && (
                                                                                    <p className="mt-1 text-xs text-amber-600">Bitte einen Vorschlag auswählen.</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor={`edit-day-summary-${day.id}`} className="block text-sm font-medium text-slate-700">
                                                                                Was ist an diesem Tag geplant? (optional)
                                                                            </label>
                                                                            <textarea
                                                                                id={`edit-day-summary-${day.id}`}
                                                                                rows={3}
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
                                                                            <p className="mt-1 text-xs text-slate-500">Tags mit Komma trennen.</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="submit"
                                                                                disabled={isUpdatingDay}
                                                                                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                            >
                                                                                {isUpdatingDay ? 'Speichern...' : 'Änderungen speichern'}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={cancelEditDay}
                                                                                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                            >
                                                                                Abbrechen
                                                                            </button>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleDayActivities(day.id)}
                                                                            className="min-w-0 flex-1 text-left"
                                                                            aria-label={collapsedDays[day.id] ? 'Aktivitäten anzeigen' : 'Aktivitäten verbergen'}
                                                                        >
                                                                            <h3 className="text-lg font-bold text-slate-800">{blockTitle}</h3>
                                                                            <p className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
                                                                                <MapPin className="h-4 w-4 text-blue-500" />
                                                                                {day.location}
                                                                            </p>
                                                                        </button>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleDayActivities(day.id)}
                                                                                aria-label={collapsedDays[day.id] ? 'Aktivitäten anzeigen' : 'Aktivitäten verbergen'}
                                                                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                                                                            >
                                                                                {collapsedDays[day.id] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                                                Aktivitäten
                                                                            </button>
                                                                            {canEditItinerary && (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => startEditDay(day.id, block)}
                                                                                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                    >
                                                                                        Bearbeiten
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleDeleteDay(day.id, block)}
                                                                                        disabled={isDeletingDay}
                                                                                        aria-label={block.days.length > 1 ? 'Tagesblock löschen' : 'Tag löschen'}
                                                                                        title={block.days.length > 1 ? 'Tagesblock löschen' : 'Tag löschen'}
                                                                                        className="inline-flex items-center rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                    >
                                                                                        {isDeletingDay
                                                                                            ? 'Löschen...'
                                                                                            : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {day.summary?.trim().length > 0 && (
                                                                        <p className="mt-3 whitespace-pre-line text-sm text-slate-700 leading-6">
                                                                            {day.summary}
                                                                        </p>
                                                                    )}
                                                                    {!collapsedDays[day.id] && (
                                                                    <div className="mt-4 relative pl-2">
                                                                        {day.activities.length > 0 && (
                                                                            <div className="absolute left-4 top-1 bottom-1 w-px bg-slate-200" aria-hidden="true" />
                                                                        )}
                                                                        <div className="space-y-3">
                                                                        {sortActivities(day.activities).map((activity) => (
                                                                            <div key={activity.id} className="relative flex items-start gap-3">
                                                                                {editingActivityId === activity.id && editingActivityDayId === day.id && canEditItinerary ? (
                                                                                    <div
                                                                                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
                                                                                        onClick={cancelEditActivity}
                                                                                    >
                                                                                    <form
                                                                                        onSubmit={(e) => handleUpdateActivity(e, day.id, activity.id)}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-4 py-4 space-y-3 shadow-xl"
                                                                                    >
                                                                                        <h4 className="text-base font-semibold text-slate-800">Aktivität bearbeiten</h4>
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
                                                                                                <option value="ACTIVITY">Aktivität</option>
                                                                                                <option value="FOOD">Essen</option>
                                                                                                <option value="LODGING">Unterkunft</option>
                                                                                                <option value="FLIGHT">Flug</option>
                                                                                            </select>
                                                                                            <button
                                                                                                type="submit"
                                                                                                disabled={isUpdatingActivity}
                                                                                                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                            >
                                                                                                {isUpdatingActivity ? 'Speichern...' : 'Speichern'}
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={cancelEditActivity}
                                                                                                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                            >
                                                                                                Abbrechen
                                                                                            </button>
                                                                                        </div>
                                                                                    </form>
                                                                                    </div>
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
                                                                                        {canEditItinerary && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => startEditActivity(day.id, activity)}
                                                                                                    className="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                                >
                                                                                                    Bearbeiten
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleDeleteActivity(day.id, activity.id)}
                                                                                                    disabled={isDeletingActivityId === activity.id}
                                                                                                    aria-label="Aktivität löschen"
                                                                                                    title="Aktivität löschen"
                                                                                                    className="inline-flex items-center rounded-lg border border-red-300 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                                >
                                                                                                    {isDeletingActivityId === activity.id ? 'Löschen...' : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                        </div>
                                                                        {day.activities.length === 0 && (
                                                                            <p className="text-sm text-slate-500">Noch keine Aktivitäten.</p>
                                                                        )}
                                                                    </div>
                                                                    )}
                                                                    {!collapsedDays[day.id] && canEditItinerary && (
                                                                        <div className="mt-4">
                                                                            {activityFormDayId === day.id ? (
                                                                                <div
                                                                                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
                                                                                    onClick={cancelAddActivity}
                                                                                >
                                                                                <form
                                                                                    onSubmit={(e) => handleAddActivity(e, day.id)}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xl"
                                                                                >
                                                                                    <h4 className="text-base font-semibold text-slate-800">Aktivität hinzufügen</h4>
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
                                                                                            placeholder="Aktivitätstitel"
                                                                                            className="sm:col-span-2 rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <select
                                                                                            value={activityType}
                                                                                            onChange={(e) => setActivityType(e.target.value as 'FLIGHT' | 'LODGING' | 'FOOD' | 'ACTIVITY')}
                                                                                            className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                                                        >
                                                                                            <option value="ACTIVITY">Aktivität</option>
                                                                                            <option value="FOOD">Essen</option>
                                                                                            <option value="LODGING">Unterkunft</option>
                                                                                            <option value="FLIGHT">Flug</option>
                                                                                        </select>
                                                                                        <button
                                                                                            type="submit"
                                                                                            disabled={isSavingActivity}
                                                                                            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                                                        >
                                                                                            {isSavingActivity ? 'Hinzufügen...' : 'Aktivität hinzufügen'}
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={cancelAddActivity}
                                                                                            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                        >
                                                                                            Abbrechen
                                                                                        </button>
                                                                                    </div>
                                                                                </form>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => startAddActivity(day.id)}
                                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                                                >
                                                                                    <Plus className="h-3.5 w-3.5" />
                                                                                    Aktivität hinzufügen
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
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Orte auf Karte</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Alle unterschiedlichen Orte aus deiner Reiseplanung im Überblick.
                                    </p>
                                </div>

                                {isLoadingExplorePoints && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                        Orte werden geladen...
                                    </div>
                                )}

                                {exploreError && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {exploreError}
                                    </div>
                                )}

                                {!isLoadingExplorePoints && !exploreError && exploreLocations.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <p className="text-sm text-slate-600">
                                            Es sind noch keine Orte in der Reiseplanung vorhanden.
                                        </p>
                                    </div>
                                )}

                                {!isLoadingExplorePoints && !exploreError && exploreMapPoints.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                        <TripExploreMap points={exploreMapPoints} />
                                    </div>
                                )}

                                {!isLoadingExplorePoints && !exploreError && exploreLocations.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Orte aus der Planung</p>
                                        <div className="mt-3 space-y-2">
                                            {exploreOrderedStops.map((stop, index) => (
                                                <div
                                                    key={`${stop.location}-${stop.dayNumber}`}
                                                    className="inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                                >
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                                                        {index + 1}
                                                    </span>
                                                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                                                    <span className="font-medium">{stop.location}</span>
                                                    <span className="text-xs text-slate-500">ab Tag {stop.dayNumber}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'budget' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Reisebudget</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Erfasse Kostenschätzungen vor der Reise, um die voraussichtlichen Gesamtkosten besser einschätzen zu können.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAddBudgetForm((prev) => !prev)}
                                                className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Kosten hinzufügen
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Gesamtschätzung</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{formatCurrency(totalBudgetCents)}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Pro Person</p>
                                        <p className="mt-1 text-xl font-bold text-slate-800">{formatCurrency(totalBudgetPerPersonCents)}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Kostenverteilung</p>
                                        {budgetCategoryChartData.length > 0 ? (
                                            <div className="mt-3 space-y-3">
                                                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200">
                                                    {budgetCategoryChartData.map((entry) => (
                                                        <div
                                                            key={entry.category}
                                                            className="h-full"
                                                            style={{
                                                                width: `${entry.sharePercent}%`,
                                                                backgroundColor: entry.color,
                                                            }}
                                                            title={`${formatBudgetCategory(entry.category)}: ${formatCurrency(entry.totalCents)}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                    {budgetCategoryChartData.map((entry) => (
                                                        <div
                                                            key={entry.category}
                                                            className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                                                            title={`${formatBudgetCategory(entry.category)}: ${formatCurrency(entry.totalCents)}`}
                                                        >
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full"
                                                                style={{ backgroundColor: entry.color }}
                                                                aria-hidden="true"
                                                            />
                                                            {(() => {
                                                                const { Icon } = getBudgetCategoryIcon(entry.category);
                                                                return <Icon className="h-3.5 w-3.5" style={{ color: entry.color }} aria-hidden="true" />;
                                                            })()}
                                                            <span>{formatCurrency(entry.totalCents)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-sm text-slate-500">Noch keine Kategorien vorhanden.</p>
                                        )}
                                    </div>
                                </div>

                                {budgetError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {budgetError}
                                    </div>
                                )}

                                {showAddBudgetForm && canEditBudget && (
                                    <div
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
                                        onClick={resetBudgetForm}
                                    >
                                        <div
                                            className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xl"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <form onSubmit={handleAddBudgetItem} className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-semibold text-slate-800">Kosten hinzufügen</h3>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="sm:col-span-2">
                                                        <label htmlFor="budget-title" className="block text-sm font-medium text-slate-700">Welche Kosten erwartest du?</label>
                                                        <input
                                                            id="budget-title"
                                                            type="text"
                                                            required
                                                            value={budgetTitle}
                                                            onChange={(e) => setBudgetTitle(e.target.value)}
                                                            placeholder="z. B. Flüge nach Tokio"
                                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="budget-category" className="block text-sm font-medium text-slate-700">Kategorie</label>
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
                                                        <label htmlFor="budget-amount" className="block text-sm font-medium text-slate-700">Geschätzte Kosten (EUR)</label>
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
                                                        <label htmlFor="budget-pricing-mode" className="block text-sm font-medium text-slate-700">Kostenart</label>
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
                                                        <label htmlFor="budget-people-count" className="block text-sm font-medium text-slate-700">Für wie viele Personen?</label>
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
                                                        <label htmlFor="budget-day-start" className="block text-sm font-medium text-slate-700">Ab Reisetag</label>
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
                                                        <label htmlFor="budget-day-end" className="block text-sm font-medium text-slate-700">Bis Reisetag</label>
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
                                                            ? 'Der eingegebene Betrag gilt pro Person.'
                                                            : 'Der eingegebene Betrag gilt für die gesamte Gruppe.'}
                                                    </p>
                                                </div>
                                                {addBudgetWarnings.length > 0 && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Hinweise</p>
                                                        <ul className="mt-1 space-y-1 text-xs text-amber-800">
                                                            {addBudgetWarnings.map((warning) => (
                                                                <li key={warning}>• {warning}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="budget-notes" className="block text-sm font-medium text-slate-700">Notizen</label>
                                                        <input
                                                            id="budget-notes"
                                                            type="text"
                                                            value={budgetNotes}
                                                            onChange={(e) => setBudgetNotes(e.target.value)}
                                                            placeholder="Optionale Details"
                                                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={isSavingBudget}
                                                        className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isSavingBudget ? 'Speichern...' : 'Schätzung speichern'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={resetBudgetForm}
                                                        disabled={isSavingBudget}
                                                        className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Abbrechen
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {budgetItems.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                        <h3 className="text-lg font-semibold text-slate-800">Noch keine Schätzungen</h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {canManage
                                                ? 'Füge die erste Kostenschätzung für diese Reise hinzu.'
                                                : 'Der Besitzer hat noch keine Budgetschätzungen hinzugefügt.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {groupedBudgetItems.map((group) => {
                                            const isCollapsed = collapsedBudgetCategories[group.category] ?? true;

                                            return (
                                                <div key={group.category} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBudgetCategory(group.category)}
                                                        className="grid w-full items-center gap-3 px-4 py-4 text-left transition-all hover:bg-slate-50 hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_132px_auto]"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                                                                {(() => {
                                                                    const { Icon } = getBudgetCategoryIcon(group.category);
                                                                    return (
                                                                        <Icon
                                                                            className="h-4 w-4"
                                                                            style={{ color: getBudgetCategoryChartColor(group.category) }}
                                                                        />
                                                                    );
                                                                })()}
                                                                {formatBudgetCategory(group.category)}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {group.items.length} Einträge
                                                            </p>
                                                        </div>
                                                        <span className="hidden h-8 items-center justify-center rounded-md bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 sm:inline-flex sm:w-[132px] sm:justify-self-end">
                                                            {formatCurrency(group.totalCents)}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 sm:justify-self-end">
                                                            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                        </span>
                                                    </button>

                                                    {!isCollapsed && (
                                                        <div className="border-t border-slate-100 bg-slate-50/40">
                                                            <div className="hidden items-center gap-3 border-b border-slate-200 bg-slate-100/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_132px_auto]">
                                                                <span>Posten</span>
                                                                <span className="text-right">Kosten</span>
                                                                <span />
                                                            </div>
                                                            <div className="divide-y divide-slate-200">
                                                            {group.items.map((item) => {
                                                                const warnings = getBudgetWarningEntries({
                                                                    pricingMode: item.pricingMode,
                                                                    peopleCount: item.peopleCount,
                                                                    dayStart: item.dayStart,
                                                                    dayEnd: item.dayEnd,
                                                                    estimatedCostCents: item.estimatedCostCents,
                                                                });
                                                                const primaryWarning = warnings[0];
                                                                const additionalWarnings = warnings.slice(1);
                                                                const warningStyles =
                                                                    primaryWarning?.level === 'high'
                                                                        ? 'border-red-200 bg-red-50 text-red-800'
                                                                        : primaryWarning?.level === 'medium'
                                                                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-700';
                                                                const hasLongNotes = Boolean(item.notes && (item.notes.length > 140 || item.notes.includes('\n')));
                                                                const isNotesExpanded = expandedBudgetNotes[item.id] ?? false;

                                                                return (
                                                                <div
                                                                    key={item.id}
                                                                    className={`bg-white px-4 py-3 ${
                                                                        canEditBudget && editingBudgetId !== item.id
                                                                            ? 'group/budget-item transition-all hover:bg-blue-50/70 hover:shadow-sm'
                                                                            : ''
                                                                    }`}
                                                                >
                                                {editingBudgetId === item.id && canEditBudget ? (
                                                    <form onSubmit={(e) => handleUpdateBudgetItem(e, item.id)} className="space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="sm:col-span-2">
                                                                <label htmlFor={`edit-budget-title-${item.id}`} className="block text-sm font-medium text-slate-700">Welche Kosten erwartest du?</label>
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
                                                                <label htmlFor={`edit-budget-category-${item.id}`} className="block text-sm font-medium text-slate-700">Kategorie</label>
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
                                                                <label htmlFor={`edit-budget-amount-${item.id}`} className="block text-sm font-medium text-slate-700">Geschätzte Kosten (EUR)</label>
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
                                                                <label htmlFor={`edit-budget-pricing-mode-${item.id}`} className="block text-sm font-medium text-slate-700">Kostenart</label>
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
                                                                <label htmlFor={`edit-budget-people-count-${item.id}`} className="block text-sm font-medium text-slate-700">Für wie viele Personen?</label>
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
                                                                <label htmlFor={`edit-budget-day-start-${item.id}`} className="block text-sm font-medium text-slate-700">Ab Reisetag</label>
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
                                                                <label htmlFor={`edit-budget-day-end-${item.id}`} className="block text-sm font-medium text-slate-700">Bis Reisetag</label>
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
                                                                    ? 'Der eingegebene Betrag gilt pro Person.'
                                                                    : 'Der eingegebene Betrag gilt für die gesamte Gruppe.'}
                                                            </p>
                                                        </div>
                                                        {getBudgetWarnings({
                                                            pricingMode: editBudgetPricingMode,
                                                            peopleCount: editBudgetPeopleCount,
                                                            dayStart: parseOptionalDayNumber(editBudgetDayStart),
                                                            dayEnd: parseOptionalDayNumber(editBudgetDayEnd),
                                                            estimatedCostCents: Math.round((Number(editBudgetEstimatedCost) || 0) * 100),
                                                        }).length > 0 && (
                                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Hinweise</p>
                                                                <ul className="mt-1 space-y-1 text-xs text-amber-800">
                                                                    {getBudgetWarnings({
                                                                        pricingMode: editBudgetPricingMode,
                                                                        peopleCount: editBudgetPeopleCount,
                                                                        dayStart: parseOptionalDayNumber(editBudgetDayStart),
                                                                        dayEnd: parseOptionalDayNumber(editBudgetDayEnd),
                                                                        estimatedCostCents: Math.round((Number(editBudgetEstimatedCost) || 0) * 100),
                                                                    }).map((warning) => (
                                                                        <li key={warning}>• {warning}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="sm:col-span-3">
                                                                <label htmlFor={`edit-budget-notes-${item.id}`} className="block text-sm font-medium text-slate-700">Notizen</label>
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
                                                                {isUpdatingBudget ? 'Speichern...' : 'Änderungen speichern'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteBudgetItem(item.id)}
                                                                disabled={isDeletingBudgetId === item.id || isUpdatingBudget}
                                                                className="inline-flex items-center rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isDeletingBudgetId === item.id ? 'Löschen...' : 'Löschen'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditBudgetItem}
                                                                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                Abbrechen
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div
                                                        role={canEditBudget ? 'button' : undefined}
                                                        tabIndex={canEditBudget ? 0 : undefined}
                                                        onClick={canEditBudget ? () => startEditBudgetItem(item) : undefined}
                                                        onKeyDown={canEditBudget ? (e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                startEditBudgetItem(item);
                                                            }
                                                        } : undefined}
                                                        className={`grid grid-cols-1 gap-4 rounded-lg px-2 py-1 sm:grid-cols-[minmax(0,1fr)_132px_auto] sm:items-center sm:gap-3 ${
                                                            canEditBudget
                                                                ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200'
                                                                : ''
                                                        }`}
                                                        aria-label={canEditBudget ? `${item.title} bearbeiten` : undefined}
                                                        title={canEditBudget ? 'Klicken zum Bearbeiten' : undefined}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-sm font-semibold text-slate-800 transition-colors sm:text-[15px] group-hover/budget-item:text-blue-800">
                                                                    {item.title}
                                                                </h3>
                                                                {canEditBudget && (
                                                                    <span className="hidden items-center gap-1 rounded-md border border-blue-200 bg-white/90 px-2 py-0.5 text-[11px] font-medium text-blue-700 opacity-0 transition-all duration-150 group-hover/budget-item:opacity-100 sm:inline-flex">
                                                                        <Pencil className="h-3 w-3" />
                                                                        Bearbeiten
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {primaryWarning && (
                                                                <div className={`mt-2 rounded-lg border px-2.5 py-1.5 ${warningStyles}`}>
                                                                    <p className="text-[11px] font-medium">
                                                                        Hinweis: {primaryWarning.message}
                                                                    </p>
                                                                    {additionalWarnings.length > 0 && (
                                                                        <details className="mt-1">
                                                                            <summary className="cursor-pointer text-[11px] font-medium">
                                                                                Weitere Hinweise ({additionalWarnings.length})
                                                                            </summary>
                                                                            <ul className="mt-1 space-y-1 text-[11px]">
                                                                                {additionalWarnings.map((warning) => (
                                                                                    <li key={warning.message}>• {warning.message}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </details>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {item.notes && (
                                                                <div className={primaryWarning ? 'mt-3' : 'mt-1'}>
                                                                    <p
                                                                        className={`whitespace-pre-wrap break-words text-sm text-slate-500 ${
                                                                            hasLongNotes && !isNotesExpanded ? 'line-clamp-2' : ''
                                                                        }`}
                                                                    >
                                                                        {item.notes}
                                                                    </p>
                                                                    {hasLongNotes && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleBudgetNotes(item.id);
                                                                            }}
                                                                            className="mt-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                                                                        >
                                                                            {isNotesExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="sm:hidden">
                                                            <span className="inline-flex h-8 items-center justify-center rounded-md bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                                                                {formatCurrency(getBudgetItemTotalCents(item))}
                                                            </span>
                                                        </div>
                                                        <span className="hidden h-8 items-center justify-center rounded-md bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 transition-colors group-hover/budget-item:bg-blue-200 sm:inline-flex sm:w-[132px] sm:justify-self-end">
                                                                {formatCurrency(getBudgetItemTotalCents(item))}
                                                        </span>
                                                        <span className="hidden sm:block" />
                                                    </div>
                                                )}
                                                                </div>
                                                                );
                                                            })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'chat' && (
                            <TripChatPanel
                                tripId={trip.id}
                                currentUserId={currentUserId}
                                initialMessages={trip.chatMessages}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
