'use client'
import { useState, useEffect } from 'react'

type Theme = 'nature' | 'night' | 'pastel' | 'landscapes' | 'wildlife' | 'landmarks' | 'macro' | 'water' | 'architecture' | 'cities'

const wallpapers: Record<Theme, string[]> = {
  nature: [
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed6af?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1499002238440-d264edd596ec?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1473773508845-188df298d2d1?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504198070170-4b42a3e9e1b6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?q=80&w=2728&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434394354979-a235cd36269d?q=80&w=2670&auto=format&fit=crop',
  ],
  night: [
    'https://images.unsplash.com/photo-1505506874110-6a7a5e2e6e3a?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472552944129-b24a36b3c7a9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2573&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2713&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516331138075-f3adc1e149cd?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1462332420958-a05d1e002413?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502481851512-e9e2529bf9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515705576963-95cad62945b6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518533954129-7774297db69d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518066000714-58c45f1a2c0a?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1545156521-77bd85671d30?q=80&w=2680&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2691&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1489549132488-d00b33835ac5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460186136353-3922bb2a4eab?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511884642898-4c86945e7633?q=80&w=2670&auto=format&fit=crop',
  ],
  pastel: [
    'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2687&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508615039623-a25605fcd3e6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1567225557594-88d73e55f2cb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546929662-711aa81148cf?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1603484477859-abe6a7370f4b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550686041-366ad85fad7b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517315003714-a071486ed9d8?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503455637927-730bce8583c0?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1554189097-0f0345fa7787?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579547621113-e59843c0de0c?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1569091791842-7cfb64e04797?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1562043236-559c3b65ba8e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2675&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546928686-286c9fbde1ec?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1563291074-2bf8677ac0e5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579547621113-e59843c0de0c?q=80&w=2670&auto=format&fit=crop',
  ],
  landscapes: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434394354979-a235cd36269d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496483353456-90997957cf99?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1439853949127-fa647821eba0?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464983953574-0892a716854b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1468476775582-6bede20f356f?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465188162913-8fb5709d6d29?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1463694775559-eea25626346b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1468657988500-aca2be09f4c6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470093851219-69951fcbb533?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464278533981-501fde3cd4cd?q=80&w=2670&auto=format&fit=crop',
  ],
  wildlife: [
    'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=2659&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555169062-013468b47731?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1456926631375-92c8ce872def?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551085254-e96b210db58a?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1568572933382-74d440642117?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550358864-518f202c02ba?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584559582128-b8be739912e1?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1567608192118-1e0cd0c0c3e5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1535338454770-8be927b5a00b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1563991655280-9c7c8e7d0b8a?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559253664-ca249d4600c8?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552728089-57bdde30beb3?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560807707-8cc77767d783?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546527868-ccb7ee7dfa6a?q=80&w=2670&auto=format&fit=crop',
  ],
  landmarks: [
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=2696&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546412414-e1885259569a?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543429776-2782fc8e1acd?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559564484-e48b3e040ff4?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549893072-4bc5e3c52d41?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523731407965-2430cd12f279?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534008897995-27a23e859048?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526397751294-331021109fbd?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549813069-f95e44d7f498?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529946576495-1c9e5e9c2b35?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2673&auto=format&fit=crop',
  ],
  macro: [
    'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1454789476662-53eb23ba5907?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501696461415-6bd6660c6742?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1468276311594-df7cb65d8df6?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1487147264018-f937fba0c817?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504548840739-580b10ae7715?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1473773508845-188df298d2d1?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1446071103084-c257b5f70672?q=80&w=2680&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1464692805480-a69dfaafdb0d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501003878151-bb8e717dc2f7?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504541891213-1b1dfdadb739?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1448932223592-d1fc686e76ea?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?q=80&w=2728&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496483353456-90997957cf99?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2670&auto=format&fit=crop',
  ],
  water: [
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=2673&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2670&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2673&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1439405326854-0144a3a12f98?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1468413253725-0d5181091126?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1520942702018-0862200e6873?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1520454974749-611b7248ffdb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516900557549-41557d405adf?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?q=80&w=2672&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=2670&auto=format&fit=crop',
  ],
  architecture: [
    'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506126279646-a697353d3166?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b0eb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1486718448742-163732cd1544?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496307653780-42ee777d4833?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2665&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503174971376-6e8db75be1b8?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1475855581690-80accde3ae2b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=2676&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505576391880-b3f9d713dc4f?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=2671&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?q=80&w=2674&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?q=80&w=2670&auto=format&fit=crop',
  ],
  cities: [
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2644&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2656&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444723121867-7a241cacace9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1471623320832-752e8bbf802e?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505761671935-60b3a742bf0a?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=2664&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523731407965-2430cd12f279?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2673&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=2656&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=2696&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2644&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2670&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1471623320832-752e8bbf802e?q=80&w=2670&auto=format&fit=crop',
  ],
}

export default function DynamicBg() {
  const [activeTheme, setActiveTheme] = useState<Theme>('landscapes')
  const [bgIndex, setBgIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    console.log('DynamicBg mounted, starting interval')
    const interval = setInterval(() => {
      console.log('Rotating wallpaper')
      setBgIndex(prev => (prev + 1) % wallpapers[activeTheme].length)
    }, 60000)

    return () => clearInterval(interval)
  }, [activeTheme])

  const currentBg = wallpapers[activeTheme][bgIndex]

  return (
    <>
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${currentBg})` }}
      />
      <div className="fixed inset-0 z-[1] bg-black/5" />

      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg"
        >
          🎨 Wallpaper
        </button>

        {isOpen && (
          <div className="absolute bottom-12 right-0 bg-white p-3 rounded-lg shadow-xl space-y-2 w-48 max-h-80 overflow-y-auto">
            <button onClick={() => setActiveTheme('landscapes')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'landscapes'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Stunning Landscapes
            </button>
            <button onClick={() => setActiveTheme('wildlife')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'wildlife'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Wildlife & Wonders
            </button>
            <button onClick={() => setActiveTheme('landmarks')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'landmarks'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Landmarks & Ruins
            </button>
            <button onClick={() => setActiveTheme('architecture')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'architecture'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Architecture
            </button>
            <button onClick={() => setActiveTheme('cities')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'cities'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              City Skylines
            </button>
            <button onClick={() => setActiveTheme('macro')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'macro'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Abstract & Macro
            </button>
            <button onClick={() => setActiveTheme('water')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'water'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Water Bodies
            </button>
            <button onClick={() => setActiveTheme('nature')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'nature'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Nature
            </button>
            <button onClick={() => setActiveTheme('night')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'night'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Night Sky
            </button>
            <button onClick={() => setActiveTheme('pastel')} className={`w-full text-left text-xs p-2 rounded ${activeTheme === 'pastel'? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
              Colors
            </button>
          </div>
        )}
      </div>
    </>
  )
}