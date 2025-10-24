// components/EnthusiastHub.jsx
import React from 'react';
import { Star, Info } from 'lucide-react';

const EnthusiastHub = ({ favorites, nearestStops }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Bus Enthusiast Hub</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border border-purple-100">
          <div className="flex items-center space-x-3 mb-4">
            <Star className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Favorite Stops
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Quickly access your favorite bus stops.
          </p>
          {favorites.size > 0 ? (
            <div className="space-y-2">
              {Array.from(favorites).map((favId) => {
                const stop = nearestStops.find((s) => s.naptanId === favId);
                return stop ? (
                  <div key={favId} className="text-sm text-purple-800">
                    • {stop.commonName}
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No favorites yet</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl shadow-lg p-6 border border-green-100">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">API Status</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live  Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Location: Enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Favorites: {favorites.size} stops</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnthusiastHub;