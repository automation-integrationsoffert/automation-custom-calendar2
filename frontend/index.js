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

// Order Detail Card Component
function OrderDetailCard({ orderNo, orderRecord, orderTable, calendarEvents, eventsTable, onClose }) {

    // Early return if eventsTable is not available
    if (!eventsTable || !eventsTable.fields) {
        return (
            <div 
                className="order-detail-card flex-shrink-0"
                style={{ 
                    width: '280px',
                    minWidth: '280px',
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}
            >
                <div className="text-xs text-red-600">Error: Events table not available</div>
            </div>
        );
    }
    
    // Find Calendar Events that match this order number
    // Field name is exactly "Order"
    const orderField = eventsTable.fields.find(field => 
        field.name === 'Order'
    );
    
    // Get Order No field from Orders table to compare values
    const orderNoFieldInOrders = orderRecord?.table?.fields?.find(field => 
        field.name === 'Order No' || 
        field.name === 'Order No.' ||
        field.name.toLowerCase().includes('order no')
    );
    
    const matchingEvents = calendarEvents ? calendarEvents.filter(event => {
        if (!orderField) {
            console.log('Order field not found in Calendar Events');
            return false;
        }
        
        const eventOrderValue = event.getCellValue(orderField.name);
        if (!eventOrderValue) {
            return false;
        }
        
        // Handle linked records (array) - when Order field links to Orders table
        if (Array.isArray(eventOrderValue)) {
            return eventOrderValue.some(linkedRecord => {
                // First check: if the linked record's ID matches the order record's ID (most reliable)
                if (linkedRecord.id === orderRecord.id) {
                    console.log(`Matched by ID: ${linkedRecord.id} === ${orderRecord.id}`);
                    return true;
                }
                
                // Second check: try to get Order No from the linked record and compare
                if (orderNoFieldInOrders) {
                    try {
                        // Try different ways to get the Order No value
                        let linkedOrderNo = null;
                        
                        // Method 1: If linkedRecord has getCellValueAsString method
                        if (typeof linkedRecord.getCellValueAsString === 'function') {
                            linkedOrderNo = linkedRecord.getCellValueAsString(orderNoFieldInOrders.name);
                        }
                        // Method 2: If linkedRecord has getCellValue method
                        else if (typeof linkedRecord.getCellValue === 'function') {
                            const cellValue = linkedRecord.getCellValue(orderNoFieldInOrders.name);
                            linkedOrderNo = cellValue ? cellValue.toString() : null;
                        }
                        // Method 3: Try accessing as property
                        else if (linkedRecord[orderNoFieldInOrders.name]) {
                            linkedOrderNo = linkedRecord[orderNoFieldInOrders.name].toString();
                        }
                        // Method 4: Use name property as fallback
                        else {
                            linkedOrderNo = linkedRecord.name || linkedRecord.id;
                        }
                        
                        if (linkedOrderNo) {
                            const orderNoStr = orderNo.toString().trim();
                            const linkedOrderNoStr = linkedOrderNo.toString().trim();
                            
                            if (linkedOrderNoStr === orderNoStr) {
                                console.log(`Matched by Order No: ${linkedOrderNoStr} === ${orderNoStr}`);
                                return true;
                            }
                        }
                    } catch (e) {
                        console.log('Error getting Order No from linked record:', e);
                    }
                }
                
                return false;
            });
        }
        
        // Handle direct value (if Order field is a text field with order number)
        const eventOrderNo = eventOrderValue.toString().trim();
        const orderNoStr = orderNo.toString().trim();
        const matches = eventOrderNo === orderNoStr;
        if (matches) {
            console.log(`Matched by text value: ${eventOrderNo} === ${orderNoStr}`);
        }
        return matches;
    }) : [];
    
    console.log(`Found ${matchingEvents.length} matching events for order ${orderNo}`);
    console.log('Order field found:', orderField?.name);
    console.log('Order No field in Orders table:', orderNoFieldInOrders?.name);
    console.log('All Calendar Events fields:', eventsTable.fields.map(f => f.name));
    
    // Field names are exactly: Visualization, Arbetsorder, Mekaniker
    const visualizationField = eventsTable.fields.find(f => 
        f.name === 'Visualization'
    );
    
    // Try to find Arbetsorder field - could be "Arbetsorder" or "Arbetsorder beskrivning"
    const arbetsorderField = eventsTable.fields.find(f => 
        f.name === 'Arbetsorder' ||
        f.name === 'Arbetsorder beskrivning' ||
        f.name.toLowerCase() === 'arbetsorder'
    );
    
    const mekanikerField = eventsTable.fields.find(f => 
        f.name === 'Mekaniker'
    );
    
    console.log('Fields found:', {
        visualizationField: visualizationField?.name || 'NOT FOUND',
        arbetsorderField: arbetsorderField?.name || 'NOT FOUND',
        mekanikerField: mekanikerField?.name || 'NOT FOUND'
    });
    
    // If no matching events but we have calendar events, log why
    if (matchingEvents.length === 0 && calendarEvents && calendarEvents.length > 0) {
        console.log('Sample event Order field values:', calendarEvents.slice(0, 3).map(ev => {
            const orderVal = orderField ? ev.getCellValue(orderField.name) : null;
            return {
                eventId: ev.id,
                orderValue: orderVal,
                orderValueType: typeof orderVal,
                isArray: Array.isArray(orderVal)
            };
        }));
    }
    
    // Get Fordon from Orders table where Order No matches the selected order number
    let fordon = '';
    let fordonField = null;
    
    // Use orderTable if provided, otherwise get from orderRecord
    const ordersTable = orderTable || orderRecord?.table;
    
    if (ordersTable && orderRecord) {
        console.log('Getting Fordon from Orders table:', {
            orderNo: orderNo,
            orderRecordId: orderRecord.id,
            tableName: ordersTable?.name,
            availableFields: ordersTable?.fields?.map(f => f.name) || []
        });
        
        // Find Fordon field in Orders table - try exact match first, then case-insensitive
        fordonField = ordersTable.fields?.find(f => 
            f.name === 'Fordon'
        ) || ordersTable.fields?.find(f => 
            f.name.toLowerCase() === 'fordon' ||
            f.name.toLowerCase().includes('fordon')
        ) || null;
        
        if (fordonField) {
            try {
                // Try getCellValueAsString first
                fordon = orderRecord.getCellValueAsString(fordonField.name) || '';
                
                // If empty, try getCellValue
                if (!fordon) {
                    const fordonValue = orderRecord.getCellValue(fordonField.name);
                    if (fordonValue) {
                        fordon = String(fordonValue);
                    }
                }
                
                console.log('Fordon retrieved:', {
                    fieldName: fordonField.name,
                    value: fordon || 'empty',
                    fieldType: fordonField.type
                });
            } catch (e) {
                console.error('Error getting Fordon:', e);
                // Try alternative method
                try {
                    const fordonValue = orderRecord.getCellValue(fordonField.name);
                    fordon = fordonValue ? String(fordonValue) : '';
                    console.log('Fordon retrieved (alternative method):', fordon || 'empty');
                } catch (e2) {
                    console.error('Error getting Fordon (alternative method):', e2);
                }
            }
        } else {
            console.warn('Fordon field not found in Orders table. Available fields:', ordersTable.fields?.map(f => f.name) || []);
        }
    } else {
        console.error('Cannot get Fordon - missing ordersTable or orderRecord:', {
            hasOrderTable: !!orderTable,
            hasOrderRecord: !!orderRecord,
            orderRecordTable: orderRecord?.table?.name
        });
    }
    
    return (
        <div 
            className="order-detail-card p-3 flex-shrink-0"
            style={{ 
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Close button */}
            {/* <button
                onClick={onClose}
                className="absolute top-2 right-2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold z-10"
            >
                ×
            </button> */}
            
            {/* Order Number Header */}
            {/* <div className="font-bold text-sm mb-2 text-gray-700 border-b pb-1 pr-6">
                Order: {orderNo}
                {matchingEvents.length > 0 && (
                    <span className="text-xs font-normal text-gray-500 ml-2">
                        ({matchingEvents.length} event{matchingEvents.length > 1 ? 's' : ''})
                    </span>
                )}
            </div> */}
            
            {/* Horizontal scrollable list of matching events */}
            <div className="flex-1">
                {matchingEvents.length > 0 ? (
                    <div className="flex gap-3" style={{ margin: 'auto' }}>
                        {matchingEvents.map((event, index) => {
                            // Get image from event using exact field name "Attachments"
                            let imageUrl = null;
                                if (event && eventsTable) {
                                    try {
                                        const attachmentField =
                                            eventsTable.fields.find(
                                                f => f.name.toLowerCase().trim() === 'attachments'
                                                    // f.type === 'multipleAttachment'
                                            );
                                        if (attachmentField) {
                                            const attachments = event.getCellValue(attachmentField.name);
                                            if (attachments && Array.isArray(attachments) && attachments.length > 0) {
                                                imageUrl =
                                                    attachments[0].url ||
                                                    attachments[0].thumbnails?.large?.url ||
                                                    attachments[0].thumbnails?.small?.url;
                                            }
                                        } else {
                                            console.warn("⚠️ Attachments field not found in Calendar Events table. Available fields:", eventsTable.fields.map(f => f.name));
                                        }
                                    } catch (e) {
                                        console.error('Error getting image:', e);
                                    }
                                }
                            
                            // Get other values from this event
                            let visualization = '';
                            let arbetsorder = '';
                            let mekanikerNames = '';
                            
                            try {
                                if (event && visualizationField) {
                                    visualization = event.getCellValueAsString(visualizationField.name) || '';
                                }
                            } catch (e) {
                                console.error('Error getting Visualization:', e);
                            }
                            
                            try {
                                if (event && arbetsorderField) {
                                    arbetsorder = event.getCellValueAsString(arbetsorderField.name) || '';
                                    console.log(`Arbetsorder value for event ${index + 1}:`, arbetsorder || 'empty');
                                } else {
                                    console.log(`Arbetsorder field not found for event ${index + 1}`);
                                }
                            } catch (e) {
                                console.error('Error getting Arbetsorder:', e);
                            }
                            
                            try {
                                if (event && mekanikerField) {
                                    const mekaniker = event.getCellValue(mekanikerField.name) || [];
                                    if (Array.isArray(mekaniker)) {
                                        mekanikerNames = mekaniker.map(m => {
                                            if (typeof m === 'string') return m;
                                            if (m && m.name) return m.name;
                                            if (m && m.value) return m.value;
                                            return String(m);
                                        }).filter(Boolean).join(', ');
                                    }
                                }
                            } catch (e) {
                                console.error('Error getting Mekaniker:', e);
                            }
                            
                            console.log(`Event ${index + 1} (${event.id}) data:`, {
                                hasImage: !!imageUrl,
                                hasArbetsorderField: !!arbetsorderField,
                                arbetsorderFieldName: arbetsorderField?.name,
                                visualization: visualization || 'empty',
                                arbetsorder: arbetsorder || 'empty',
                                mekanikerNames: mekanikerNames || 'empty'
                            });
                            
                            return (
                                <div 
                                    key={event.id || index}
                                    className="flex-shrink-0"
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                >
                                    {/* Image - First line (at the very top) */}
                                    {imageUrl ? (
                                        <div className="mb-2" style={{ width: '100px', height: '100px', overflow: 'hidden', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                            <img 
                                                src={imageUrl} 
                                                alt={`Order ${orderNo} Event ${index + 1}`}
                                                style={{ width: '100px', height: '100px', objectFit: 'cover', display: 'block', margin: '0 auto' }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="mb-2 text-xs text-gray-400 italic text-center border border-dashed border-gray-300 rounded" style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            No image
                                        </div>
                                    )}
                                    
                                                                       
                                    {/* Visualization - Second line */}
                                    <div className="mb-1 text-xs text-center">
                                        {visualization ? (
                                            <span className="text-gray-800">{visualization}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">Not set</span>
                                        )}
                                    </div>
                                    
                                    {/* Fordon - Third line (from Orders table) */}
                                    <div className="mb-1 text-xs text-center">
                                        <span className="font-semibold text-gray-600">REG: </span>
                                        {fordon ? (
                                            <span className="text-gray-800">{fordon}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">Not set</span>
                                        )}
                                    </div>
                                    
                                    {/* Arbetsorder - Fourth line */}
                                                                        
                                    {/* Mekaniker - Fifth line */}
                                    <div className="mb-1 text-xs text-center">
                                        <span className="font-semibold text-gray-600">Namn: </span>
                                        {mekanikerNames ? (
                                            <span className="text-gray-800">{mekanikerNames}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">Not set</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-xs text-gray-500 mt-4 p-4 text-center">
                        <div className="mb-2 font-semibold">No matching calendar events found</div>
                        <div className="text-xs text-gray-400">
                            {!orderField && <div>⚠️ Order field not found in Calendar Events table</div>}
                            {orderField && <div>No events found where Order field matches "{orderNo}"</div>}
                            <div className="mt-2 text-xs">
                                Check console (F12) for debugging information
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Calendar Images Gallery Component (shows at top)
function CalendarImagesGallery({ events, eventsTable }) {

    if (!eventsTable || !events || events.length === 0) {
        return null;
    }
    
    // Verify this is the Calendar Events table, not Orders table
    if (eventsTable.name !== 'Calendar Events' && eventsTable.name !== 'CalendarEvents') {
        return null;
    }
    
    // Collect all images from all Calendar Events
    // Each Calendar Events record has only one attachment image
    // Use the exact field name "Attachments" directly (no field searching needed)
    const allImages = [];
    
    events.forEach((event) => {
        try {
            // Get attachments field using exact field name "Attachments" from Calendar Events table
            const attachmentField =
                eventsTable.fields.find(
                    f => f.name.toLowerCase().trim() === 'attachments' ||
                        f.type === 'multipleAttachment'
                );

            const attachments = attachmentField
                ? event.getCellValue(attachmentField.name)
                : null;
            
            // Check if attachments exist and have items
            if (!attachments || (Array.isArray(attachments) && attachments.length === 0)) {
                return; // Skip this event
            }
            
            // Get the first attachment (each event has only one)
            const attachment = Array.isArray(attachments) ? attachments[0] : attachments;
            
            if (attachment && attachment.url) {
                // Use the URL directly from the attachment object (as shown in working example)
                allImages.push({
                    url: attachment.url,
                    eventId: event.id,
                    id: attachment.id || `${event.id}-0`
                });
            }
        } catch (e) {
            console.error('CalendarImagesGallery - Error getting attachments:', e);
        }
    });
    
    if (allImages.length === 0) {
        console.log('CalendarImagesGallery: No images found');
        return null;
    }
    
    return (
        <div 
            className="calendar-images-gallery bg-gray-50 border-b border-gray-300 p-3 mb-4"
            style={{
                width: '100%',
                overflowX: 'auto',
                overflowY: 'hidden'
            }}
        >
            {/* <div className="flex gap-3" style={{ minWidth: 'fit-content' }}>
                {allImages.map((image, index) => (
                    <div
                        key={image.id}
                        className="image-item flex-shrink-0"
                        style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid #e5e7eb',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        onClick={() => {
                            // Expand the event record when image is clicked
                            const event = events.find(e => e.id === image.eventId);
                            if (event) {
                                expandRecord(event);
                            }
                        }}
                    >
                        <img
                            src={image.url}
                            alt={`Calendar Event Image ${index + 1}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block'
                            }}
                            onError={(e) => {
                                console.error(`CalendarImagesGallery - Failed to load image: ${image.url}`, e);
                                e.target.style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'flex items-center justify-center h-full text-xs text-gray-400';
                                errorDiv.textContent = 'Image failed to load';
                                e.target.parentElement.appendChild(errorDiv);
                            }}
                            onLoad={() => {
                                console.log(`CalendarImagesGallery - Successfully loaded image: ${image.url}`);
                            }}
                        />
                    </div>
                ))}
            </div> */}
        </div>
    );
}

// Order Details Panel Component (shows at top)
function OrderDetailsPanel({ selectedOrderNumbers, orders, orderTable, calendarEvents, eventsTable, onCloseOrder }) {
    console.log('OrderDetailsPanel - selectedOrderNumbers:', Array.from(selectedOrderNumbers));
    console.log('OrderDetailsPanel - orders count:', orders?.length);
    
    if (selectedOrderNumbers.size === 0) {
        return null;
    }
    
    // Early return if required props are missing
    if (!orderTable || !eventsTable) {
        console.log('OrderDetailsPanel - Missing orderTable or eventsTable');
        return null;
    }
    
    // Get selected order records
    const orderNoField = orderTable?.fields?.find(field => 
        field.name === 'Order No' || 
        field.name === 'Order No.' ||
        field.name.toLowerCase().includes('order no')
    );
    
    const selectedOrders = orders ? orders.filter(order => {
        if (!orderNoField) return false;
        const orderNo = order.getCellValueAsString(orderNoField.name);
        return selectedOrderNumbers.has(orderNo);
    }) : [];
    
    console.log('OrderDetailsPanel - selectedOrders count:', selectedOrders.length);
    console.log('OrderDetailsPanel - selectedOrders:', selectedOrders.map(o => {
        const no = orderNoField ? o.getCellValueAsString(orderNoField.name) : o.id;
        return no;
    }));
    
    if (selectedOrders.length === 0) {
        return null;
    }
    
    return (
        <div 
            className="order-details-panel p-3 mb-4"
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div className="flex gap-3" style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
                {selectedOrders.map(order => {
                    const orderNo = orderNoField ? order.getCellValueAsString(orderNoField.name) : order.id;
                    console.log('Rendering OrderDetailCard for:', orderNo);
                    return (
                        <OrderDetailCard
                            key={order.id}
                            orderNo={orderNo}
                            orderRecord={order}
                            orderTable={orderTable}
                            calendarEvents={calendarEvents || []}
                            eventsTable={eventsTable}
                            onClose={() => onCloseOrder(orderNo)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Order List Component
function OrderList({ orders, orderTable, selectedOrderNumbers = new Set(), onOrderClick }) {
    console.log('=== OrderList Component Rendering ===');
    console.log('orderTable:', orderTable?.name || 'NULL');
    console.log('orders count:', orders?.length || 0);
    console.log('orders array:', orders);
    
    // Always render the panel, even if there's an issue
    if (!orderTable) {
        console.log('Rendering: Order table not found state');
        return (
            <div 
                className="order-list-panel bg-white rounded-r-lg border-2 border-red-500" 
                style={{ 
                    width: '250px', 
                    minWidth: '250px',
                    height: '100%', 
                    minHeight: '500px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    flexShrink: 0,
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    zIndex: 100,
                    boxShadow: '-2px 0 8px rgba(0,0,0,0.1)'
                }}
            >
                <div className="px-4 py-3 border-b-2 border-red-300 bg-red-50 flex-shrink-0">
                    <h3 className="text-sm font-bold text-red-700">Order No.</h3>
                    <div className="text-xs text-red-600 mt-1">⚠️ DEBUG MODE</div>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-xs text-red-600 text-center">
                        <div className="mb-2 font-bold text-base">⚠️ Order table not found</div>
                        <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-100 rounded">
                            Check browser console (F12) for available tables
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                            This panel should be visible on the right side
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (orders.length === 0) {
        return (
            <div 
                className="order-list-panel bg-white rounded-r-lg border-2 border-blue-300" 
                style={{ 
                    width: '250px', 
                    minWidth: '250px',
                    height: '100%', 
                    minHeight: '500px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    flexShrink: 0,
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <div className="px-4 py-3 border-b border-gray-200 bg-blue-50 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-700">Order No.</h3>
                    <div className="text-xs text-gray-500 mt-1">0 orders</div>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-sm text-blue-600 text-center font-medium">
                        No orders found in table: {orderTable.name}
                    </div>
                </div>
            </div>
        );
    }

    // Try to get Order No field - try common field names (including with period)
    const orderNoField = orderTable.fields.find(field => 
        field.name === 'Order No' || 
        field.name === 'Order No.' ||
        field.name === 'OrderNo' || 
        field.name === 'Order Number' ||
        field.name === 'OrderNumber' ||
        field.name.toLowerCase() === 'order no' ||
        field.name.toLowerCase() === 'order no.' ||
        field.name.toLowerCase().includes('order no')
    );
    
    // Log field search for debugging
    if (!orderNoField) {
        console.log('Order No field not found. Available fields:', orderTable.fields.map(f => f.name));
    } else {
        console.log('Order No field found:', orderNoField.name);
    }

    // Get order numbers with record reference
    const orderData = orders.map(order => {
        let orderNo;
        if (orderNoField) {
            orderNo = order.getCellValueAsString(orderNoField.name) || order.id;
        } else {
            // Fallback: try to get first text field or use record ID
            const textField = orderTable.fields.find(f => f.type === 'singleLineText' || f.type === 'multilineText');
            orderNo = textField ? order.getCellValueAsString(textField.name) : order.id;
        }
        return { orderNo, record: order };
    }).filter(item => item.orderNo);

    return (
        <div 
            className="order-list-panel bg-white rounded-r-lg border-2 border-green-300" 
            style={{ 
                width: '250px', 
                minWidth: '250px',
                height: '100%', 
                minHeight: '500px',
                display: 'flex', 
                flexDirection: 'column', 
                flexShrink: 0,
                backgroundColor: '#ffffff',
                position: 'relative',
                zIndex: 10,
                overflow: 'hidden'
            }}
        >
            <div className="px-4 py-3 border-b border-gray-200 bg-green-50 sticky top-0 z-40 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-700">Order No.</h3>
                {orderData.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">{orderData.length} orders</div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                {orderData.length > 0 ? (
                    <div className="w-full">
                        {orderData.map(({ orderNo, record }, index) => {
                            const isSelected = selectedOrderNumbers.has(orderNo);
                            return (
                                <div 
                                    key={record.id}
                                    className={`text-sm px-4 py-2 cursor-pointer border-b border-gray-200 transition-colors flex items-center ${
                                        isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'text-gray-700 hover:bg-blue-50'
                                    }`}
                                    style={{ 
                                        minHeight: '36px',
                                        borderLeft: isSelected ? '4px solid #3b82f6' : '3px solid transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.borderLeftColor = '#3b82f6';
                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.borderLeftColor = 'transparent';
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                    onClick={() => {
                                        if (onOrderClick) {
                                            onOrderClick(orderNo);
                                        }
                                    }}
                                    title={isSelected ? "Click to deselect" : "Click to view order details (replaces current selection)"}
                                >
                                    <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {orderNo}
                                    </span>
                                    {isSelected && (
                                        <span className="ml-2 text-blue-600 text-xs">✓</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 p-4 text-center">No order numbers found</div>
                )}
            </div>
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
    // Table name is "Calendar Events"
    let eventsTable = null;
    try {
        eventsTable = base.getTableByName('Calendar Events');
        console.log('Found Calendar Events table');
    } catch (e) {
        try {
            eventsTable = base.getTableByName('Calendar Events');
            console.log('Found Calendar Events table (with space)');
        } catch (e2) {
            console.error('CalendarEvents table not found. Available tables:', base.tables.map(t => t.name));
        }
    }
    
    // Always call useRecords hook (required by React rules)
    // If eventsTable is null, we'll use a fallback table but won't use the data
    const eventsRaw = useRecords(eventsTable || base.tables[0] || null);
    const events = eventsTable ? eventsRaw : [];
    
    // Get Orders table - table name is "Orders"
    let orderTable = null;
    try {
        // Try to get the Orders table directly
        orderTable = base.getTableByName('Orders');
        console.log('Orders table found:', orderTable.name);
        console.log('Orders table fields:', orderTable.fields.map(f => f.name));
    } catch (error) {
        // If getTableByName fails, try finding from base.tables
        console.warn('getTableByName failed, trying base.tables:', error);
        orderTable = base.tables.find(table => table.name === 'Orders') || null;
        
        if (orderTable) {
            console.log('Orders table found via base.tables:', orderTable.name);
            console.log('Orders table fields:', orderTable.fields.map(f => f.name));
        } else {
            console.error('Orders table not found!');
            console.log('Available tables:', base.tables.map(t => t.name));
        }
    }
    
    // Always call useRecords hook (required by React rules)
    // If orderTable is null, we'll use eventsTable as fallback but won't use the data
    const orderRecordsRaw = useRecords(orderTable || eventsTable);
    const orderRecords = orderTable ? orderRecordsRaw : [];
    
    console.log('Order records count:', orderRecords.length);
    if (orderTable && orderRecords.length > 0) {
        console.log('Successfully loaded orders from Orders table');
    } else if (orderTable && orderRecords.length === 0) {
        console.warn('Orders table found but has no records');
    }

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stableMechanicOrder, setStableMechanicOrder] = useState([]);
    const [updatingRecords, setUpdatingRecords] = useState(new Set());
    const [recentlyUpdatedRecords, setRecentlyUpdatedRecords] = useState(new Set());
    const [selectedOrderNumbers, setSelectedOrderNumbers] = useState(new Set());

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

    // Handler for order click - replace previous selection with new one
    // If clicking the same order again, keep it selected (don't deselect)
    const handleOrderClick = (orderNo) => {
        setSelectedOrderNumbers(prev => {
            // If clicking the same order that's already selected, keep it selected
            if (prev.has(orderNo)) {
                return prev; // Keep the same selection
            }
            // Otherwise, replace with the new order (only one selected at a time)
            return new Set([orderNo]);
        });
    };

    // Handler for closing order detail
    const handleCloseOrder = (orderNo) => {
        setSelectedOrderNumbers(prev => {
            const newSet = new Set(prev);
            newSet.delete(orderNo);
            return newSet;
        });
    };

    return (
        <div className="p-4 font-sans w-full h-full bg-white text-gray-900" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* CALENDAR IMAGES GALLERY - Shows all images from Calendar Events at top */}
            <CalendarImagesGallery events={events} eventsTable={eventsTable} />
            
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

            {/* ORDER DETAILS PANEL - Shows selected orders at top */}
            {eventsTable && (
                <OrderDetailsPanel
                    selectedOrderNumbers={selectedOrderNumbers}
                    orders={orderRecords}
                    orderTable={orderTable}
                    calendarEvents={events}
                    eventsTable={eventsTable}
                    onCloseOrder={handleCloseOrder}
                />
            )}

            {/* MAIN BLOCK: Calendar Container with Order List */}
            <div 
                className="flex gap-0 w-full" 
                style={{ 
                    height: 'calc(100vh - 120px)', 
                    minHeight: '600px', 
                    maxHeight: 'calc(100vh - 120px)', 
                    width: '100%',
                    position: 'relative',
                    overflow: 'visible'
                }}
            >
                {displayedDates.length === 0 ? (
                    <div className="flex-1 py-10 text-center text-gray-500 flex items-center justify-center" style={{ minWidth: 0 }}>
                        Please select Start Date and End Date to view the calendar.
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(event) => console.log('Drag started:', event.active.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="relative rounded-l-lg overflow-hidden flex-1" style={{ overflowY: 'auto', overflowX: 'auto', border: '1px solid rgb(229, 231, 235)', borderRight: 'none', height: '100%' }}>
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
                
                {/* RIGHT SIDE: Order List Panel - ALWAYS VISIBLE */}
                {(() => {
                    console.log('Rendering OrderList component in main render');
                    console.log('orderRecords:', orderRecords.length);
                    console.log('orderTable:', orderTable?.name);
                    return (
                        <OrderList 
                            orders={orderRecords} 
                            orderTable={orderTable}
                            selectedOrderNumbers={selectedOrderNumbers}
                            onOrderClick={handleOrderClick}
                        />
                    );
                })()}
            </div>
        </div>
    );
}

initializeBlock({ interface: () => <CalendarInterfaceExtension /> });
