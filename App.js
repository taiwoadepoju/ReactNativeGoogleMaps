import React, { Component } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { StyleSheet, PermissionsAndroid, Platform, View, TouchableWithoutFeedback, Keyboard } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker  } from 'react-native-maps';
import PlaceInput from './components/PlaceInput';
import PolyLine from '@mapbox/polyline';
import API_KEY from './apiKey';

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasMapPermission: false,
      userLatitude: 0,
      userLongitude: 0,
      lastPosition: '',
      destinationCoordinates: []
    }
    this.map = React.createRef();
  }



  componentDidMount() {
    this.requestFineLocation()
  }

  componentWillUnmount() {
    Geolocation.clearWatch(this.watchId)
  }

  hideKeyboard = () => {
    Keyboard.dismiss()
  }

  getUserPosition() {
    this.setState({ hasMapPermission: true })
    Geolocation.watchPosition((pos) => {
      console.log('position ===', pos)
      this.setState({
        userLatitude: pos.coords.latitude,
        userLongitude: pos.coords.longitude
      })
    }, (err) => console.warn(err)), {
      enableHighAccuracy: true
    }
    this.watchId = Geolocation.watchPosition((res) => this.setState({ lastPosition: res }))
  }

  requestFineLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Permission granted...')
          this.getUserPosition()
          this.setState({ hasMapPermission: true })
        }
      }
      else {
        this.getUserPosition()
        this.setState({ hasMapPermission: true })
      }
    } catch (error) {
      console.warn(error)
    }
  }

  showDirectionsOnMap = async (placeId) => {
    const { userLongitude, userLatitude } = this.state;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${userLatitude},${userLongitude}&destination=place_id:${placeId}&key=${API_KEY}`, {
        method: "get",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      const data = res.json()
      const json = await Promise.all([data])
      const result = json[0]

      // converting polylines in response to an array of  latitudes and longitudes
      const points = PolyLine.decode(result.routes[0].overview_polyline.points);

      const formatLatitudeAndLongitude = points.map((point) => {
        return { latitude: point[0], longitude: point[1] }
      })
      this.setState({ destinationCoordinates: formatLatitudeAndLongitude });
      this.map.current.fitToCoordinates(formatLatitudeAndLongitude, { edgePadding: { top: 200, bottom: 80, left: 40, right: 40 }});
    }
    catch (error) {
      throw error
    }
  }

  render() {
    const { userLongitude, userLatitude, destinationCoordinates } = this.state;
    return (
      <TouchableWithoutFeedback onPress={this.hideKeyboard}>
        <View style={styles.container}>
          <MapView
            ref={this.map}
            showsUserLocation
            followsUserLocation
            provider={PROVIDER_GOOGLE} // remove if not using Google Maps
            style={styles.map}
            region={{
              latitude: userLatitude,
              longitude: userLongitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.0121,
            }}
          >
            {destinationCoordinates.length > 0 &&
              <Polyline
                coordinates={destinationCoordinates}
                strokeWidth={6}
                strokeColor="#444"
              />}
              {destinationCoordinates.length > 0 && 
                <Marker
                  coordinate={destinationCoordinates[destinationCoordinates.length - 1]} 
                />}
          </MapView>
          <PlaceInput userLatitude={userLatitude} userLongitude={userLongitude} showDirectionsOnMap={this.showDirectionsOnMap} />
        </View>
      </TouchableWithoutFeedback>

    )
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
