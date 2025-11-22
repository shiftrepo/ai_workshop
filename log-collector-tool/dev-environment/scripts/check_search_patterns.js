const patterns = {
    trackId: { pattern: 'TrackID:\\s*([A-Z0-9]{3,10})', flags: 'gi' },
    programId: { pattern: '\\b([A-Z]{2,6}\\d{2,4})\\b', flags: 'g' }
};

const descriptions = [
    'INC001: 認証エラー TrackID: ABC123 発生、関連してTrackID: DEF789, TrackID: MNO678でも同様の問題を確認',
    'INC003: API応答遅延 TrackID: XYZ456 DB503エラー、同時にTrackID: PQR901, TrackID: STU234でも遅延を観測',
    'INC005: バックアップ失敗 BACKUP55 TrackID: GHI012、連鎖的にTrackID: VWX567, TrackID: YZA890でも影響発生',
    'INC007: セッション切断 TrackID: JKL345 AUTH101、複数セッションで問題継続中'
];

console.log('=== 実際の検索パターン解析 ===\n');

descriptions.forEach(desc => {
    const taskId = desc.split(':')[0];
    console.log('=== ' + taskId + ' ===');

    // Extract TrackIDs
    const trackIds = [];
    const trackRegex = new RegExp(patterns.trackId.pattern, patterns.trackId.flags);
    let match;
    while ((match = trackRegex.exec(desc)) !== null) {
        trackIds.push(match[1]);
    }

    // Extract ProgramIDs
    const programIds = [];
    const progRegex = new RegExp(patterns.programId.pattern, patterns.programId.flags);
    let progMatch;
    while ((progMatch = progRegex.exec(desc)) !== null) {
        programIds.push(progMatch[1]);
    }

    // Remove duplicates
    const uniqueTrackIds = [...new Set(trackIds)];
    const uniqueProgramIds = [...new Set(programIds)];

    console.log('TrackIDs: [' + uniqueTrackIds.join(', ') + ']');
    console.log('ProgramIDs: [' + uniqueProgramIds.join(', ') + ']');
    console.log('検索パターン: "' + [...uniqueTrackIds, ...uniqueProgramIds].join('|') + '"');
    console.log('パターン長さ: ' + [...uniqueTrackIds, ...uniqueProgramIds].length + '個の検索項目');
    console.log('');
});