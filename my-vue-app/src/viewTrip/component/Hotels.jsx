import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function Hotels({ tripData = {} }) {
    const [hotels, setHotels] = useState([]);
    const defaultHotelImage = "/default-hotel.jpg"; // Default image for missing hotel images

    useEffect(() => {
        if (tripData?.hotelOptions && Array.isArray(tripData.hotelOptions)) {
            setHotels(tripData.hotelOptions);
        } else {
            setHotels([]);
        }
    }, [tripData]);

    if (!hotels.length) {
        return <p className="text-gray-500 text-center text-lg mt-5">No hotels available.</p>;
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-10">
            <h2 className="font-bold text-3xl mb-8 text-center text-gray-800">Recommended Hotels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {hotels.map((hotel, index) => (
                    <motion.div
                        key={hotel.hotelName || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full"
                    >
                        <Link
                            to={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.hotelName + " " + hotel.hotelAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-full"
                        >
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="bg-white shadow-lg rounded-xl overflow-hidden p-4 h-full flex flex-col justify-between transition-transform hover:shadow-2xl"
                            >
                                <img
                                    src={hotel.hotelImageUrl || defaultHotelImage}
                                    alt={hotel.hotelName || "Hotel"}
                                    className="rounded-lg h-48 w-full object-cover"
                                />
                                <div className="mt-4 flex flex-col text-center sm:text-left flex-grow">
                                    <h2 className="font-semibold text-lg text-gray-800">{hotel.hotelName || "Unknown Hotel"}</h2>
                                    <p className="text-sm text-gray-500 mt-1">📍 {hotel.hotelAddress || "Address not available"}</p>
                                    <p className="text-base font-medium text-blue-600 mt-2">💰 {hotel.price || "Price not available"}</p>
                                    <p className="text-base font-medium text-yellow-500 mt-2">⭐ {hotel.rating ? hotel.rating : "Not rated"}</p>
                                </div>
                            </motion.div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default Hotels;