'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, MapPin, Users, Settings, Plus,
    Coffee, Map, Camera, Utensils
} from 'lucide-react';
import { format } from 'date-fns';

// Mock data for MVP
const MOCK_TRIP = {
    id: '1',
    title: 'Summer in Kyoto',
    destination: 'Kyoto, Japan',
    startDate: new Date('2024-07-10'),
    endDate: new Date('2024-07-24'),
    collaborators: [
        { id: '1', name: 'Fred', initial: 'F', color: 'bg-blue-500' },
        { id: '2', name: 'Alex', initial: 'A', color: 'bg-green-500' },
        { id: '3', name: 'Sam', initial: 'S', color: 'bg-purple-500' }
    ],
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2000&auto=format&fit=crop'
};

const MOCK_ITINERARY = [
    {
        day: 1,
        date: new Date('2024-07-10'),
        items: [
            { id: '1', time: '10:00 AM', title: 'Arrive at KIX Airport', type: 'flight', icon: <Map className="w-4 h-4" /> },
            { id: '2', time: '12:30 PM', title: 'Check in to Ryokan', type: 'lodging', icon: <MapPin className="w-4 h-4" /> },
            { id: '3', time: '02:00 PM', title: 'Lunch at Nishiki Market', type: 'food', icon: <Utensils className="w-4 h-4" /> }
        ]
    },
    {
        day: 2,
        date: new Date('2024-07-11'),
        items: [
            { id: '4', time: '08:00 AM', title: 'Fushimi Inari Shrine', type: 'activity', icon: <Camera className="w-4 h-4" /> },
            { id: '5', time: '11:00 AM', title: 'Matcha Tasting', type: 'food', icon: <Coffee className="w-4 h-4" /> }
        ]
    }
];

export default function TripDetailsPage() {
    const [activeTab, setActiveTab] = useState('itinerary');

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20">
            {/* Hero Section */}
            <div className="h-64 sm:h-80 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/60 z-10"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={MOCK_TRIP.coverImage}
                    alt={MOCK_TRIP.title}
                    className="w-full h-full object-cover relative z-0"
                />

                <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-20 flex justify-between items-start">
                    <Link href="/" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors text-sm font-medium">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Invite</span>
                        </button>
                        <button className="flex items-center justify-center h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors">
                            <Settings className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 z-20 max-w-7xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{MOCK_TRIP.title}</h1>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-white/90 text-sm">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <MapPin className="h-4 w-4" />
                                    {MOCK_TRIP.destination}
                                </span>
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Calendar className="h-4 w-4" />
                                    {format(MOCK_TRIP.startDate, 'MMM d')} - {format(MOCK_TRIP.endDate, 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center -space-x-2">
                            {MOCK_TRIP.collaborators.map((user) => (
                                <div
                                    key={user.id}
                                    className={`h-8 w-8 rounded-full border-2 border-slate-900 ${user.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                                    title={user.name}
                                >
                                    {user.initial}
                                </div>
                            ))}
                            <div className="h-8 w-8 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xs font-bold hover:bg-white/30 transition-colors cursor-pointer shadow-sm">
                                <Plus className="h-3 w-3" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-30">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                    {/* Sidebar Navigation */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-4 sm:p-6">
                        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <button
                                onClick={() => setActiveTab('itinerary')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'itinerary' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Map className="h-4 w-4" />
                                Itinerary
                            </button>
                            <button
                                onClick={() => setActiveTab('explore')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'explore' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <MapPin className="h-4 w-4" />
                                Explore Places
                            </button>
                            <button
                                onClick={() => setActiveTab('budget')}
                                className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${activeTab === 'budget' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                            >
                                <Coffee className="h-4 w-4" /> {/* Should be a wallet icon ideally */}
                                Budget
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-white">
                        {activeTab === 'itinerary' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-800">Trip Itinerary</h2>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                                        <Plus className="h-4 w-4" />
                                        <span className="hidden sm:inline">Add Activity</span>
                                    </button>
                                </div>

                                <div className="space-y-10">
                                    {MOCK_ITINERARY.map((day) => (
                                        <div key={day.day}>
                                            <div className="sticky top-16 z-10 bg-white/95 backdrop-blur-sm py-2 mb-4 border-b border-slate-100">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-baseline gap-2">
                                                    Day {day.day}
                                                    <span className="text-sm font-medium text-slate-500">
                                                        {format(day.date, 'EEEE, MMM d')}
                                                    </span>
                                                </h3>
                                            </div>

                                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                                {day.items.map((item) => (
                                                    <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                                                        {/* Icon Marker */}
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                            {item.icon}
                                                        </div>

                                                        {/* Content Card */}
                                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ml-4 md:ml-0 md:group-odd:text-right md:group-even:text-left">
                                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mb-1 md:group-odd:justify-end">
                                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded md:group-odd:order-2">{item.time}</span>
                                                            </div>
                                                            <h4 className="text-base font-semibold text-slate-800">{item.title}</h4>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Inline Add Button */}
                                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mt-4">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-slate-100 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 hover:bg-blue-100 hover:text-blue-600 cursor-pointer transition-colors">
                                                        <Plus className="h-5 w-5" />
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-4 md:ml-0 md:group-odd:text-right border-t border-dashed border-slate-200 mt-5 hidden md:block"></div>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab !== 'itinerary' && (
                            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                    {activeTab === 'explore' ? <MapPin className="h-8 w-8" /> : <Coffee className="h-8 w-8" />}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Coming Soon</h3>
                                <p className="text-slate-500 max-w-sm">
                                    The {activeTab} feature is currently being developed for the next version of Wanderly.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
