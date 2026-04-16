import React from 'react';
import type { PerfectWorldMatch as PerfectWorldMatchType } from 'csdm/common/types/perfect-world-match';

type Props = {
  match: PerfectWorldMatchType;
};

export function PerfectWorldMatch({ match }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-auto p-16">
      <div className="rounded-8 border border-gray-300 bg-gray-50 p-12">
        <p className="text-body-strong">{match.mapName}</p>
        <p className="mt-8 text-caption text-gray-800">{new Date(match.date).toLocaleString()}</p>
        {match.mode && <p className="mt-4 text-caption text-gray-800">{match.mode}</p>}
      </div>

      <div className="my-8 flex flex-col gap-y-12">
        {match.teams.map((team) => {
          const players = match.players.filter((player) => team.playerSteamIds.includes(player.steamId));

          return (
            <div key={team.name} className="rounded-8 border border-gray-300 bg-white p-12">
              <div className="flex items-center justify-between">
                <p className="text-body-strong">{team.name}</p>
                <p className="text-subtitle">{team.score}</p>
              </div>
              <div className="mt-12 overflow-auto">
                <table className="w-full text-left text-caption">
                  <thead>
                    <tr className="text-gray-800">
                      <th className="pb-8 pr-12">Player</th>
                      <th className="pb-8 pr-12">K</th>
                      <th className="pb-8 pr-12">A</th>
                      <th className="pb-8 pr-12">D</th>
                      <th className="pb-8 pr-12">Rating</th>
                      <th className="pb-8">PW Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      return (
                        <tr key={player.steamId} className="border-t border-gray-200">
                          <td className="py-8 pr-12">{player.name}</td>
                          <td className="py-8 pr-12">{player.killCount}</td>
                          <td className="py-8 pr-12">{player.assistCount}</td>
                          <td className="py-8 pr-12">{player.deathCount}</td>
                          <td className="py-8 pr-12">{player.rating ?? '-'}</td>
                          <td className="py-8">{player.pwRating ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
