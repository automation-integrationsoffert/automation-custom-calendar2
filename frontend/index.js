import React, { useState, useEffect } from 'react';
import { initializeBlock, useBase, useRecords, expandRecord } from '@airtable/blocks/interface/ui';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './style.css';

// SVG Icon Component
function StatusIcon({ iconName, size = 20 }) {
    const iconPaths = {
        clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>,
        gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        wrench: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2l-5 5a4 4 0 0 1-5 5l-1 1a2 2 0 1 0 3 3l1-1a4 4 0 0 1 5-5l5-5z"/><circle cx="7" cy="17" r="3"/></svg>,
        tire: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6m9-9h-6m-6 0H3m15.5 5.5l-4.2-4.2m-6.6 0l-4.2 4.2m0-9l4.2 4.2m6.6 0l4.2-4.2"/></svg>,
        campaign: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
    };

    return (
        <div style={{ width: size, height: size, color: 'white' }}>
            {iconPaths[iconName] || iconPaths.gear}
        </div>
    );
}

// Droppable Cell Component
function DroppableCell({ mechanicName, date, hourIndex, hourHeight }) {
    // Use the same date format as the calendar headers (MM-DD)
    const dateString = `${date.getMonth() + 1}-${date.getDate()}`;
    const { isOver, setNodeRef } = useDroppable({
        id: `cell-${mechanicName}-${dateString}-${hourIndex}`,
    });

    return (
        <div 
            ref={setNodeRef}
            className={`calendar-cell border-b border-r border-gray-200 relative hover:bg-gray-50 ${isOver ? 'bg-blue-100' : ''}`}
            style={{ height: `${hourHeight}px` }}
        />
    );
}

// Draggable Event Component
function DraggableEvent({ event, top, height, backgroundColor, onExpand, isUpdating, isRecentlyUpdated, status, statusIcon }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `event-${event.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : (isUpdating || isRecentlyUpdated ? 0 : 1),
    };

    // Don't render if updating or recently updated
    if (isUpdating || isRecentlyUpdated) {
        return null;
    }

    const eventTitle = event.getCellValueAsString('Arbetsorder beskrivning') || 'Untitled';
    const bookingOrder = event.getCellValueAsString('Boknings-Order') || '';
    const mechanicName = event.getCellValue('Mekaniker')?.[0]?.value || '';

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                position: 'absolute',
                left: '4px',
                right: '4px',
                top: `${top}px`,
                height: `${height}px`,
                backgroundColor,
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(1px)',
            }}
            className="event-block text-white cursor-pointer hover:opacity-90 transition-all duration-200"
            {...attributes}
            {...listeners}
        >
            {/* Event content with modern design */}
            <div style={{ 
                position: 'relative', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 6px',
                overflow: 'hidden',
                textAlign: 'center'
            }}>
                {/* Centered SVG Icon at top */}
                <div style={{
                    marginBottom: '6px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <StatusIcon iconName={statusIcon} size={28} />
                </div>
                
                {/* Event title - bold and prominent */}
                <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '4px',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                }}>
                    {eventTitle}
                </div>
                
                {/* Booking order */}
                {bookingOrder && (
                    <div style={{
                        fontSize: '10px',
                        fontWeight: '500',
                        marginBottom: '2px',
                        opacity: 0.9,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%'
                    }}>
                        {bookingOrder}
                    </div>
                )}
                
                {/* Mechanic name */}
                {mechanicName && (
                    <div style={{
                        fontSize: '9px',
                        opacity: 0.8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%'
                    }}>
                        {mechanicName}
                    </div>
                )}
                
                {/* Clickable info icon */}
                <div
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        zIndex: 1000
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onMouseUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Info icon clicked:', event.id, eventTitle);
                        onExpand(event);
                    }}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onPointerUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onExpand(event);
                    }}
                    title="Click to view details"
                >
                    ℹ
                </div>
            </div>
        </div>
    );
}

function CalendarInterfaceExtension() {
    const base = useBase();
    const eventsTable = base.getTableByName('Calendar Events');
    const events = useRecords(eventsTable);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stableMechanicOrder, setStableMechanicOrder] = useState([]);
    const [updatingRecords, setUpdatingRecords] = useState(new Set());
    const [recentlyUpdatedRecords, setRecentlyUpdatedRecords] = useState(new Set());

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const hourHeight = 50;
    const headerHeight = 48;
    const dateRowHeight = 24;
    const cellWidth = 80;
    const hours = Array.from({ length: 15 }, (_, i) => `${(i + 5).toString().padStart(2, '0')}:00`); // 05:00 to 19:00

    useEffect(() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);

        setStartDate(monday.toISOString().split('T')[0]);
        setEndDate(friday.toISOString().split('T')[0]);
    }, []);

    const goToWeek = (offsetWeeks) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setDate(start.getDate() + offsetWeeks * 7);
        end.setDate(end.getDate() + offsetWeeks * 7);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    // Drag and drop handler
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        
        console.log('Drag end:', { active: active.id, over: over?.id });
        
        if (!over || active.id === over.id) {
            console.log('No valid drop target or same position');
            return;
        }

        try {
            // Parse the active and over IDs to get record and target info
            const activeId = active.id;
            const overId = over.id;
            
            console.log('Parsing IDs:', { activeId, overId });
            
            // Extract information from IDs (format: "event-{recordId}" and "cell-{mechanicName}-{dateString}-{hourIndex}")
            if (activeId.startsWith('event-') && overId.startsWith('cell-')) {
                const recordId = activeId.replace('event-', '');
                const parts = overId.split('-');
                const mechanicName = parts[1];
                const dateString = `${parts[2]}-${parts[3]}`; // MM-DD format
                const hourIndex = parts[4];
                
                console.log('Parsed values:', { recordId, mechanicName, dateString, hourIndex });
                
                // Find the record
                const record = events.find(ev => ev.id === recordId);
                if (!record) {
                    console.log('Record not found:', recordId);
                    return;
                }
                
                console.log('Found record:', record);
                
                // Convert MM-DD format to proper date using the displayed dates
                const [month, day] = dateString.split('-').map(Number);
                
                // Find the matching date from displayedDates to get the correct year
                const matchingDate = displayedDates.find(d => 
                    d.getMonth() + 1 === month && d.getDate() === day
                );
                
                if (!matchingDate) {
                    console.log('Could not find matching date in displayed dates');
                    return;
                }
                
                const targetDate = new Date(matchingDate);
                const targetHour = parseInt(hourIndex);
                const newStartTime = new Date(targetDate);
                // Convert from 0-14 hour index back to actual hour (05:00-19:00)
                newStartTime.setHours(targetHour + 5, 0, 0, 0);
                
                console.log('Date calculation:', {
                    dateString,
                    targetDate: targetDate.toISOString(),
                    targetHour,
                    newStartTime: newStartTime.toISOString(),
                    newStartTimeLocal: newStartTime.toString()
                });
                
                // Calculate new end time (keep same duration)
                const oldStartTime = new Date(record.getCellValue('Starttid'));
                const oldEndTime = new Date(record.getCellValue('Sluttid'));
                const duration = oldEndTime - oldStartTime;
                const newEndTime = new Date(newStartTime.getTime() + duration);
                
                console.log('Time comparison:', {
                    oldStartTime: oldStartTime.toISOString(),
                    oldEndTime: oldEndTime.toISOString(),
                    duration: duration / (1000 * 60 * 60), // duration in hours
                    newStartTime: newStartTime.toISOString(),
                    newEndTime: newEndTime.toISOString()
                });
                
                // Update mechanic if different
                const currentMechanic = record.getCellValue('Mekaniker')?.[0]?.value;
                const updates = {
                    'Starttid': newStartTime,
                    'Sluttid': newEndTime
                };
                
                if (currentMechanic !== mechanicName) {
                    console.log('Attempting to update mechanic from', currentMechanic, 'to', mechanicName);
                    
                    // Try to update the "Mekaniker" field specifically
                    try {
                        console.log("hereeeeeeeeeeeeeeeeeeeeeee", eventsTable);
                        const mekanikerField = eventsTable.getFieldByName('Mekaniker');
                        if (mekanikerField) {
                            console.log('Found Mekaniker field:', mekanikerField.name, 'Type:', mekanikerField.type);
                            
                            // Check if we have permission to update this field
                            if (eventsTable.hasPermissionToUpdateRecords([record], [{ fields: { [mekanikerField.id]: true } }])) {
                                console.log('Mekaniker field is updatable, attempting to link mechanic...');
                                
                                // Use existing mechanic record ID if available
                                const mechanicId = mechanicNameToId[mechanicName];
                                if (mechanicId) {
                                    updates['Mekaniker'] = [{ id: mechanicId }];
                                    console.log('Updated Mekaniker field with existing mechanic ID:', mechanicId, 'for mechanic:', mechanicName);
                                } else {
                                    console.warn('No existing record ID found for mechanic:', mechanicName);
                                    console.log('Available mechanic IDs:', mechanicNameToId);
                                    // Fallback to using name (this might create a new record)
                                    updates['Mekaniker'] = [{ name: mechanicName }];
                                    console.log('Using name as fallback (may create new record):', mechanicName);
                                }
                            } else {
                                console.log('No permission to update Mekaniker field');
                            }
                        } else {
                            console.log('Mekaniker field not found in Calendar Events table');
                        }
                    } catch (error) {
                        console.log('Error accessing Mekaniker field:', error.message);
                    }
                }
                
                console.log('Updating record with:', updates);
                
                // Add record to updating set to prevent visual glitch
                setUpdatingRecords(prev => new Set([...prev, recordId]));
                
                // Check if we have permission to update records
                if (!eventsTable.hasPermissionToUpdateRecords([record])) {
                    console.warn('No permission to update records. Please enable record editing in Airtable base settings.');
                    alert('Cannot update records: Record editing is not enabled for this table. Please contact your base administrator to enable record editing permissions.');
                    setUpdatingRecords(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(recordId);
                        return newSet;
                    });
                    return;
                }
                
                try {
                    // Update the record
                    await eventsTable.updateRecordAsync(record, updates);
                    console.log('Record updated successfully');
                    
                    // Add to recently updated records to prevent immediate re-render glitch
                    setRecentlyUpdatedRecords(prev => new Set([...prev, recordId]));
                    
                    // Remove from updating set
                    setUpdatingRecords(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(recordId);
                        return newSet;
                    });
                    
                    // Clear from recently updated after a delay to allow data to refresh
                    setTimeout(() => {
                        setRecentlyUpdatedRecords(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(recordId);
                            return newSet;
                        });
                    }, 1000); // 1 second delay
                    
                } catch (error) {
                    // Remove from updating set on error too
                    setUpdatingRecords(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(recordId);
                        return newSet;
                    });
                    throw error;
                }
            } else {
                console.log('Invalid drag/drop combination:', { activeId, overId });
            }
        } catch (error) {
            console.error('Error updating record:', error);
        }
    };

    // Build mechanic profiles and collect existing mechanic record IDs
    const mechanicProfiles = {};
    const mechanicNameToId = {}; // Map mechanic names to their record IDs
    const currentMechanicOrder = []; // Current order from events
    
    events.forEach(ev => {
        const mechLinked = ev.getCellValue('Mekaniker') || [];
        const mechProfile = ev.getCellValue('Mekaniker') || [];
        mechLinked.forEach((m, i) => {
            if (!mechanicProfiles[m.value]) {
                mechanicProfiles[m.value] = {
                    name: m.value,
                    profileUrl: mechProfile[i]?.value?.thumbnails?.small?.url || null
                };
                if (!currentMechanicOrder.includes(m.value)) {
                    currentMechanicOrder.push(m.value);
                }
            }
        });
    });
    
    // Check the Mekaniker field to get existing mechanic record IDs
    events.forEach(ev => {
        const mekaniker = ev.getCellValue('Mekaniker');
        if (mekaniker && mekaniker.length > 0) {
            const mechRecord = mekaniker[0];
            const mechName = mechRecord.name || mechRecord;
            const mechId = mechRecord.id || mechRecord;
            
            // Store the mapping of name to ID
            mechanicNameToId[mechName] = mechId;
            
            if (!mechanicProfiles[mechName]) {
                mechanicProfiles[mechName] = {
                    name: mechName,
                    profileUrl: null
                };
                if (!currentMechanicOrder.includes(mechName)) {
                    currentMechanicOrder.push(mechName);
                }
            }
        }
    });
    
    console.log('Mechanic name to ID mapping:', mechanicNameToId);
    
    // Set stable order only once, or if it's empty
    if (stableMechanicOrder.length === 0 && currentMechanicOrder.length > 0) {
        setStableMechanicOrder(currentMechanicOrder);
        console.log('Setting initial mechanic order:', currentMechanicOrder);
    }
    
    // Use stable order if available, otherwise use current order
    const orderToUse = stableMechanicOrder.length > 0 ? stableMechanicOrder : currentMechanicOrder;
    const mechanics = orderToUse.map(name => mechanicProfiles[name]).filter(Boolean);
    
    // Debug: Log mechanic order to help troubleshoot
    console.log('Stable order:', stableMechanicOrder);
    console.log('Current order:', currentMechanicOrder);
    console.log('Using order:', orderToUse);
    console.log('Mechanics array:', mechanics.map(m => m.name));

    const getDisplayedDates = () => {
        if (!startDate || !endDate) return [];
        
        // Always calculate a proper Monday-Friday week based on startDate
        const start = new Date(startDate);
        const dayOfWeek = start.getDay();
        const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
        const monday = new Date(start);
        monday.setDate(start.getDate() + mondayOffset);
        
        const dates = [];
        for (let i = 0; i < 5; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const displayedDates = getDisplayedDates();

    const formatShortDate = date => `${date.getMonth() + 1}-${date.getDate()}`;

    const getEventsForMechanicAndDate = (mechanicName, date) => {
        return events.filter(ev => {
            const mechLinked = ev.getCellValue('Mekaniker') || [];
            const start = new Date(ev.getCellValue('Starttid'));
            if (start.toDateString() !== date.toDateString()) return false;
            return mechLinked.some(m => m.value === mechanicName);
        });
    };

    const statusColors = {
        'Offertförfrågan skickad': '#ef4444', // Red
        'Bokad och skickad till kalender': '#3b82f6', // Blue
        'Pågående arbete': '#f97316', // Orange
        'Arbete klart (inväntar hämtning)': '#14b8a6', // Teal
        'Avslutad': '#22c55e', // Green
        'Inget': '#6b7280' // Gray
    };

    const statusIcons = {
        'Offertförfrågan skickad': 'clock',
        'Bokad och skickad till kalender': 'gear',
        'Pågående arbete': 'wrench',
        'Arbete klart (inväntar hämtning)': 'tire',
        'Avslutad': 'campaign',
        'Inget': 'gear'
    };

    return (
        <div className="p-4 font-sans w-full h-full bg-white text-gray-900">
            {/* TOP SECTION: Navigation Buttons */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button 
                    onClick={() => goToWeek(-1)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                >
                    Förra veckan
                </button>
                <button 
                    onClick={() => {
                    const now = new Date();
                    const dayOfWeek = now.getDay();
                    const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
                    const monday = new Date(now);
                    monday.setDate(now.getDate() + mondayOffset);
                    const friday = new Date(monday);
                    friday.setDate(monday.getDate() + 4);
                    setStartDate(monday.toISOString().split('T')[0]);
                    setEndDate(friday.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                >
                    Denna veckan
                </button>
                <button 
                    onClick={() => goToWeek(1)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                >
                    Nästa vecka
                </button>
            </div>

            {/* MAIN BLOCK: Calendar Container */}
            {displayedDates.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                    Please select Start Date and End Date to view the calendar.
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(event) => console.log('Drag started:', event.active.id)}
                    onDragEnd={handleDragEnd}
                >
                    <div className="relative border border-gray-200 rounded-lg overflow-hidden">
                    {/* MAIN CALENDAR SECTION */}
                    <div className="flex overflow-x-auto">
                        
                        {/* LEFT SIDEBAR: Time Column */}
                        <div className="left-sidebar flex-shrink-0 border-r border-gray-200 bg-gray-50" style={{ marginTop: `${headerHeight + dateRowHeight}px` }}>
                        {hours.map((hour, i) => (
                                <div 
                                    key={i} 
                                    className="time-cell border-b border-gray-200 text-xs text-gray-500 text-right pr-2 py-1"
                                    style={{ height: `${hourHeight}px` }}
                                >
                                    {hour}
                                </div>
                        ))}
                    </div>

                        {/* MAIN SECTION: Mechanic Sub-Calendars */}
                        <div className="main-section flex gap-3">
                            {mechanics.map((mech, mechIndex) => (
                                <div 
                                    key={`mechanic-${mech.name}`} 
                                    className="mechanic-sub-calendar flex-none border border-gray-200 bg-white"
                                    style={{ width: `${displayedDates.length * cellWidth}px` }}
                                >
                                    
                                    {/* MECHANIC HEADER: Avatar + Name */}
                                    <div 
                                        className="mechanic-header bg-white flex items-center justify-center gap-2 border-b border-gray-200"
                                        style={{ 
                                    position: 'sticky',
                                    top: 0,
                                            zIndex: 30,
                                            height: `${headerHeight}px`
                                        }}
                                    >
                                    {mech.profileUrl && (
                                            <img 
                                                src={mech.profileUrl} 
                                                alt="Profile" 
                                                className="w-8 h-8 rounded-full" 
                                            />
                                        )}
                                        <h3 className="m-0 text-sm font-semibold">{mech.name}</h3>
                                </div>

                                    {/* SUB HEADER: Day Names */}
                                    <div 
                                        className="day-header bg-white border-b border-gray-200 font-semibold text-center grid"
                                        style={{ 
                                    position: 'sticky',
                                    top: `${headerHeight}px`,
                                            zIndex: 20,
                                            gridTemplateColumns: `repeat(${displayedDates.length}, 1fr)`,
                                            height: `${dateRowHeight}px`
                                        }}
                                    >
                                    {displayedDates.map(date => (
                                            <div 
                                                key={date.toDateString()} 
                                                className="day-cell border-r border-gray-200 flex items-center justify-center"
                                            >
                                                {formatShortDate(date)}
                                            </div>
                                    ))}
                                </div>

                                    {/* MAIN CALENDAR CELLS: Time Grid */}
                                    <div 
                                        className="calendar-grid grid"
                                        style={{ gridTemplateColumns: `repeat(${displayedDates.length}, 1fr)` }}
                                    >
                                    {displayedDates.map(date => (
                                            <div key={date.toDateString()} className="date-column relative">
                                            {hours.map((hour, i) => (
                                                    <DroppableCell
                                                        key={i}
                                                        mechanicName={mech.name}
                                                        date={date}
                                                        hourIndex={i}
                                                        hourHeight={hourHeight}
                                                    />
                                                ))}

                                                {/* EVENTS: Overlay on calendar cells */}
                                            {getEventsForMechanicAndDate(mech.name, date).map(ev => {
                                                const start = new Date(ev.getCellValue('Starttid'));
                                                const end = new Date(ev.getCellValue('Sluttid'));
                                                    
                                                    // Adjust for 05:00-19:00 time range (subtract 5 hours from start time)
                                                    const adjustedStartHour = start.getHours() - 5;
                                                    const adjustedEndHour = end.getHours() - 5;
                                                    
                                                    // Only show events that fall within our 05:00-19:00 range
                                                    if (adjustedStartHour < 0 || adjustedStartHour >= 15) {
                                                        return null;
                                                    }
                                                    
                                                    const top = adjustedStartHour * hourHeight + (start.getMinutes() / 60) * hourHeight;
                                                const height = ((end - start) / (1000 * 60 * 60)) * hourHeight;

                                                const status = ev.getCellValue('Order Status')?.[0]?.value || 'Inget';
                                                    const backgroundColor = statusColors[status] || '#6b7280';
                                                    const statusIcon = statusIcons[status] || '❓';

                                                return (
                                                        <DraggableEvent
                                                            key={ev.id}
                                                            event={ev}
                                                            top={top}
                                                            height={height}
                                                            backgroundColor={backgroundColor}
                                                            onExpand={expandRecord}
                                                            isUpdating={updatingRecords.has(ev.id)}
                                                            isRecentlyUpdated={recentlyUpdatedRecords.has(ev.id)}
                                                            status={status}
                                                            statusIcon={statusIcon}
                                                        />
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                    </div>
                </DndContext>
            )}
        </div>
    );
}

initializeBlock({ interface: () => <CalendarInterfaceExtension /> });
